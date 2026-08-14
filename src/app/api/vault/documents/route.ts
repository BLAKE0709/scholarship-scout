import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { documents, studentProfiles, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function getStudentForAuth(authUserId: string) {
  const [student] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(users.id, authUserId))
    .limit(1);
  return student;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await getStudentForAuth(authUser.id);
    if (!student) {
      return NextResponse.json({ data: [] });
    }

    const data = await db
      .select()
      .from(documents)
      .where(eq(documents.studentId, student.id))
      .orderBy(desc(documents.uploadedAt));

    const mapped = data.map((d) => ({
      id: d.id,
      type: d.type,
      name: d.name,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      uploadedAt: d.uploadedAt,
    }));

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error("[Documents API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await getStudentForAuth(authUser.id);
    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) ?? "Untitled";
    const docType = (formData.get("type") as string) ?? "other";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be under 10MB" },
        { status: 400 },
      );
    }

    // Validate document type
    const validTypes = [
      "transcript",
      "recommendation_letter",
      "certificate",
      "financial_aid",
      "other",
    ];
    const sanitizedType = validTypes.includes(docType) ? docType : "other";

    // Generate a safe file path
    const fileExt = file.name.split(".").pop() ?? "bin";
    const timestamp = Date.now();
    const storagePath = `${student.id}/vault/${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Documents API] Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 },
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("documents").getPublicUrl(storagePath);

    // Create database record
    const [created] = await db
      .insert(documents)
      .values({
        studentId: student.id,
        type: sanitizedType as
          | "transcript"
          | "recommendation_letter"
          | "certificate"
          | "financial_aid"
          | "other",
        name: name,
        fileUrl: publicUrl,
        fileSize: file.size,
        mimeType: file.type || null,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: created.id,
          type: created.type,
          name: created.name,
          fileUrl: created.fileUrl,
          fileSize: created.fileSize,
          mimeType: created.mimeType,
          uploadedAt: created.uploadedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Documents API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await getStudentForAuth(authUser.id);
    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 },
      );
    }

    // Get the document to find the storage path
    const [doc] = await db
      .select()
      .from(documents)
      .where(
        and(eq(documents.id, documentId), eq(documents.studentId, student.id)),
      )
      .limit(1);

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Try to extract storage path from URL and delete from storage
    try {
      const url = new URL(doc.fileUrl);
      const pathSegments = url.pathname.split(
        "/storage/v1/object/public/documents/",
      );
      if (pathSegments[1]) {
        await supabase.storage
          .from("documents")
          .remove([decodeURIComponent(pathSegments[1])]);
      }
    } catch {
      // If storage delete fails, still delete the DB record
      console.warn("[Documents API] Could not delete file from storage");
    }

    // Delete database record
    await db
      .delete(documents)
      .where(
        and(eq(documents.id, documentId), eq(documents.studentId, student.id)),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Documents API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
