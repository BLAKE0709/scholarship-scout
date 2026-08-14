import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  applications,
  documents,
  studentProfiles,
  users,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify application ownership
    const [application] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(eq(applications.id, id), eq(applications.studentId, student.id)),
      )
      .limit(1);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    // Fetch documents for this student
    // Documents are linked to the student, not directly to applications.
    // We return all documents belonging to the student since they can attach any to an application.
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.studentId, student.id))
      .orderBy(desc(documents.uploadedAt));

    return NextResponse.json({ data: docs });
  } catch (error) {
    console.error("[Documents API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: applicationId } = await context.params;
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

    // Verify application ownership
    const [application] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.studentId, student.id),
        ),
      )
      .limit(1);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const type = formData.get("type") as string | null;

    if (!file || !name || !type) {
      return NextResponse.json(
        { error: "Missing required fields: file, name, type" },
        { status: 400 },
      );
    }

    const validTypes = [
      "transcript",
      "recommendation_letter",
      "certificate",
      "financial_aid",
      "other",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          error: `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    // Validate MIME type
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPG",
        },
        { status: 400 },
      );
    }

    // Upload to Supabase Storage
    const storagePath = `${student.id}/applications/${applicationId}/${Date.now()}-${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
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

    // Create document record
    const [created] = await db
      .insert(documents)
      .values({
        studentId: student.id,
        type: type as
          | "transcript"
          | "recommendation_letter"
          | "certificate"
          | "financial_aid"
          | "other",
        name,
        fileUrl: publicUrl,
        fileSize: file.size,
        mimeType: file.type,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[Documents API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: applicationId } = await context.params;
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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify application ownership
    const [application] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.studentId, student.id),
        ),
      )
      .limit(1);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId query parameter is required" },
        { status: 400 },
      );
    }

    // Fetch document to get file URL for storage deletion
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

    // Extract storage path from file URL
    // The URL structure from getPublicUrl is: {supabaseUrl}/storage/v1/object/public/documents/{path}
    const urlParts = doc.fileUrl.split("/storage/v1/object/public/documents/");
    if (urlParts.length === 2) {
      const storagePath = decodeURIComponent(urlParts[1]);
      await supabase.storage.from("documents").remove([storagePath]);
    }

    // Delete document record
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
