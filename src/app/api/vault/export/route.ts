import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { studentProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { exportVaultJSON, exportVaultText } from "@/lib/vault/exporter";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [student] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "json";

    if (format === "text") {
      const text = await exportVaultText(student.id, authUser.id);
      return new NextResponse(text, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="scholarship-vault-${new Date().toISOString().split("T")[0]}.txt"`,
        },
      });
    }

    // Default: JSON
    const data = await exportVaultJSON(student.id, authUser.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Vault Export API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to export vault" },
      { status: 500 },
    );
  }
}
