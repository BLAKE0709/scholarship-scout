import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { linkCodes, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Characters that avoid ambiguity: no 0/O, 1/I/L
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateLinkCode(): string {
  let code = "";
  const randomBytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[randomBytes[i] % CODE_CHARS.length];
  }
  return code;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the requesting user is a student
    const [studentUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!studentUser || studentUser.role !== "student") {
      return NextResponse.json(
        { error: "Only student accounts can generate link codes" },
        { status: 403 },
      );
    }

    // Deactivate any existing unused codes for this student
    await db
      .update(linkCodes)
      .set({ used: true })
      .where(
        and(eq(linkCodes.studentId, authUser.id), eq(linkCodes.used, false)),
      );

    // Generate a unique code with retry logic
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    while (true) {
      code = generateLinkCode();
      // Check uniqueness
      const [existing] = await db
        .select({ id: linkCodes.id })
        .from(linkCodes)
        .where(eq(linkCodes.code, code))
        .limit(1);

      if (!existing) break;

      attempts++;
      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { error: "Failed to generate a unique code. Please try again." },
          { status: 500 },
        );
      }
    }

    // Set expiration to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [created] = await db
      .insert(linkCodes)
      .values({
        studentId: authUser.id,
        code,
        expiresAt,
        used: false,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          code: created.code,
          expiresAt: created.expiresAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Family Code API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate link code" },
      { status: 500 },
    );
  }
}
