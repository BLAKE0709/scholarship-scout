import { db } from "@/lib/db";
import {
  studentProfiles,
  users,
  achievements,
  documents,
  essays,
  fidelityScores,
  apsScores,
  applications,
  scholarships,
  matches,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

interface VaultExportJSON {
  exportedAt: string;
  profile: Record<string, unknown> | null;
  user: { fullName: string | null; email: string; role: string } | null;
  achievements: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  essays: Record<string, unknown>[];
  fidelityScores: Record<string, unknown>[];
  apsScores: Record<string, unknown>[];
  applications: Record<string, unknown>[];
}

export async function exportVaultJSON(
  studentId: string,
  userId: string,
): Promise<VaultExportJSON> {
  // Fetch all vault data in parallel
  const [
    profileRows,
    userRows,
    achievementRows,
    documentRows,
    essayRows,
    fidelityRows,
    apsRows,
    applicationRows,
  ] = await Promise.all([
    db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, studentId))
      .limit(1),
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db
      .select()
      .from(achievements)
      .where(eq(achievements.studentId, studentId))
      .orderBy(desc(achievements.createdAt)),
    db
      .select({
        id: documents.id,
        type: documents.type,
        name: documents.name,
        fileSize: documents.fileSize,
        mimeType: documents.mimeType,
        uploadedAt: documents.uploadedAt,
      })
      .from(documents)
      .where(eq(documents.studentId, studentId))
      .orderBy(desc(documents.uploadedAt)),
    db
      .select()
      .from(essays)
      .where(eq(essays.studentId, studentId))
      .orderBy(desc(essays.updatedAt)),
    db
      .select()
      .from(fidelityScores)
      .where(eq(fidelityScores.studentId, studentId))
      .orderBy(desc(fidelityScores.createdAt)),
    db
      .select()
      .from(apsScores)
      .where(eq(apsScores.studentId, studentId))
      .orderBy(desc(apsScores.createdAt)),
    db
      .select({
        id: applications.id,
        scholarshipId: applications.scholarshipId,
        status: applications.status,
        submittedAt: applications.submittedAt,
        notes: applications.notes,
        createdAt: applications.createdAt,
        scholarshipName: scholarships.name,
        amountMin: scholarships.amountMin,
        amountMax: scholarships.amountMax,
      })
      .from(applications)
      .innerJoin(scholarships, eq(applications.scholarshipId, scholarships.id))
      .where(eq(applications.studentId, studentId))
      .orderBy(desc(applications.updatedAt)),
  ]);

  const profile = profileRows[0] ?? null;
  const user = userRows[0] ?? null;

  return {
    exportedAt: new Date().toISOString(),
    profile: profile
      ? {
          id: profile.id,
          gpa: profile.gpa,
          gpa_scale: profile.gpaScale,
          sat_score: profile.satScore,
          act_score: profile.actScore,
          graduation_year: profile.graduationYear,
          state: profile.state,
          city: profile.city,
          school_name: profile.schoolName,
          grade_level: profile.gradeLevel,
          intended_major: profile.intendedMajor,
          interests: profile.interests,
          extracurriculars: profile.extracurriculars,
          vault_health_score: profile.vaultHealthScore,
        }
      : null,
    user: user
      ? {
          fullName: user.fullName,
          email: user.email,
          role: user.role ?? "student",
        }
      : null,
    achievements: achievementRows.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      organization: a.organization,
      dateStart: a.dateStart,
      dateEnd: a.dateEnd,
      verified: a.verified,
    })),
    documents: documentRows.map((d) => ({
      id: d.id,
      type: d.type,
      name: d.name,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      uploadedAt: d.uploadedAt,
    })),
    essays: essayRows.map((e) => ({
      id: e.id,
      title: e.title,
      wordCount: e.wordCount,
      fidelityScore: e.fidelityScore,
      apsScore: e.apsScore,
      status: e.status,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    fidelityScores: fidelityRows.map((f) => ({
      id: f.id,
      score: f.score,
      stylisticConsistency: f.stylisticConsistency,
      processAuthenticity: f.processAuthenticity,
      aiIntegrationQuality: f.aiIntegrationQuality,
      vocabularyAlignment: f.vocabularyAlignment,
      conceptualOriginality: f.conceptualOriginality,
      createdAt: f.createdAt,
    })),
    apsScores: apsRows.map((a) => ({
      id: a.id,
      score: a.score,
      promptSophistication: a.promptSophistication,
      criticalEvaluation: a.criticalEvaluation,
      creativeIntegration: a.creativeIntegration,
      iterativeRefinement: a.iterativeRefinement,
      ethicalAwareness: a.ethicalAwareness,
      assessmentDate: a.assessmentDate,
      createdAt: a.createdAt,
    })),
    applications: applicationRows.map((app) => ({
      id: app.id,
      scholarshipName: app.scholarshipName,
      status: app.status,
      amountMin: app.amountMin,
      amountMax: app.amountMax,
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
    })),
  };
}

export async function exportVaultText(
  studentId: string,
  userId: string,
): Promise<string> {
  const data = await exportVaultJSON(studentId, userId);
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("SCHOLARSHIP SCOUT - STUDENT VAULT EXPORT");
  lines.push("=".repeat(60));
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  lines.push("");

  // Profile
  lines.push("-".repeat(40));
  lines.push("STUDENT PROFILE");
  lines.push("-".repeat(40));
  if (data.user) {
    lines.push(`Name: ${data.user.fullName ?? "Not set"}`);
    lines.push(`Email: ${data.user.email}`);
  }
  if (data.profile) {
    const p = data.profile;
    lines.push(`School: ${p.school_name ?? "Not set"}`);
    lines.push(`State: ${p.state ?? "Not set"}`);
    lines.push(`Grade Level: ${p.grade_level ?? "Not set"}`);
    lines.push(`Graduation Year: ${p.graduation_year}`);
    lines.push(
      `GPA: ${p.gpa ? `${p.gpa}/${p.gpa_scale ?? "4.0"}` : "Not reported"}`,
    );
    lines.push(`SAT: ${p.sat_score ?? "Not reported"}`);
    lines.push(`ACT: ${p.act_score ?? "Not reported"}`);
    lines.push(`Intended Major: ${p.intended_major ?? "Not set"}`);
    if (Array.isArray(p.interests) && p.interests.length > 0) {
      lines.push(`Interests: ${p.interests.join(", ")}`);
    }
    if (Array.isArray(p.extracurriculars) && p.extracurriculars.length > 0) {
      lines.push(`Extracurriculars: ${p.extracurriculars.join(", ")}`);
    }
  }
  lines.push("");

  // Achievements
  lines.push("-".repeat(40));
  lines.push(`ACHIEVEMENTS (${data.achievements.length})`);
  lines.push("-".repeat(40));
  if (data.achievements.length === 0) {
    lines.push("No achievements recorded.");
  } else {
    for (const ach of data.achievements) {
      lines.push(`[${String(ach.type).toUpperCase()}] ${ach.title}`);
      if (ach.organization) lines.push(`  Organization: ${ach.organization}`);
      if (ach.description) lines.push(`  Description: ${ach.description}`);
      if (ach.dateStart) {
        lines.push(
          `  Period: ${ach.dateStart}${ach.dateEnd ? ` to ${ach.dateEnd}` : " - Present"}`,
        );
      }
      if (ach.verified) lines.push("  [VERIFIED]");
      lines.push("");
    }
  }
  lines.push("");

  // Essays
  lines.push("-".repeat(40));
  lines.push(`ESSAYS (${data.essays.length})`);
  lines.push("-".repeat(40));
  if (data.essays.length === 0) {
    lines.push("No essays recorded.");
  } else {
    for (const essay of data.essays) {
      lines.push(`Title: ${essay.title}`);
      lines.push(`  Words: ${essay.wordCount} | Status: ${essay.status}`);
      if (essay.fidelityScore !== null) {
        lines.push(`  Fidelity Score: ${essay.fidelityScore}`);
      }
      lines.push("");
    }
  }
  lines.push("");

  // Documents
  lines.push("-".repeat(40));
  lines.push(`DOCUMENTS (${data.documents.length})`);
  lines.push("-".repeat(40));
  if (data.documents.length === 0) {
    lines.push("No documents uploaded.");
  } else {
    for (const doc of data.documents) {
      lines.push(`[${String(doc.type).toUpperCase()}] ${doc.name}`);
      if (doc.fileSize) {
        const size =
          (doc.fileSize as number) < 1048576
            ? `${((doc.fileSize as number) / 1024).toFixed(1)} KB`
            : `${((doc.fileSize as number) / 1048576).toFixed(1)} MB`;
        lines.push(`  Size: ${size}`);
      }
      lines.push("");
    }
  }
  lines.push("");

  // Scores
  lines.push("-".repeat(40));
  lines.push("SCORES");
  lines.push("-".repeat(40));
  if (data.fidelityScores.length > 0) {
    const latest = data.fidelityScores[0];
    lines.push(`Fidelity Score: ${latest.score}`);
    lines.push(`  Stylistic Consistency: ${latest.stylisticConsistency}`);
    lines.push(`  Process Authenticity: ${latest.processAuthenticity}`);
    lines.push(`  AI Integration Quality: ${latest.aiIntegrationQuality}`);
    lines.push(`  Vocabulary Alignment: ${latest.vocabularyAlignment}`);
    lines.push(`  Conceptual Originality: ${latest.conceptualOriginality}`);
  } else {
    lines.push("Fidelity Score: Not yet assessed");
  }
  lines.push("");
  if (data.apsScores.length > 0) {
    const latest = data.apsScores[0];
    lines.push(`AI Proficiency Score (APS): ${latest.score}`);
    lines.push(`  Prompt Sophistication: ${latest.promptSophistication}`);
    lines.push(`  Critical Evaluation: ${latest.criticalEvaluation}`);
    lines.push(`  Creative Integration: ${latest.creativeIntegration}`);
    lines.push(`  Iterative Refinement: ${latest.iterativeRefinement}`);
    lines.push(`  Ethical Awareness: ${latest.ethicalAwareness}`);
  } else {
    lines.push("APS Score: Not yet assessed");
  }
  lines.push("");

  // Applications
  lines.push("-".repeat(40));
  lines.push(`APPLICATIONS (${data.applications.length})`);
  lines.push("-".repeat(40));
  if (data.applications.length === 0) {
    lines.push("No applications submitted.");
  } else {
    const totalApplied = data.applications.reduce(
      (sum, a) => sum + ((a.amountMin as number) ?? 0),
      0,
    );
    const totalWon = data.applications
      .filter((a) => a.status === "accepted")
      .reduce((sum, a) => sum + ((a.amountMin as number) ?? 0), 0);

    lines.push(`Total Value Applied: $${totalApplied.toLocaleString()}`);
    lines.push(`Total Value Won: $${totalWon.toLocaleString()}`);
    lines.push("");

    for (const app of data.applications) {
      lines.push(
        `${app.scholarshipName} | ${String(app.status).toUpperCase()} | $${(app.amountMin as number).toLocaleString()}`,
      );
    }
  }

  lines.push("");
  lines.push("=".repeat(60));
  lines.push("END OF VAULT EXPORT");
  lines.push("=".repeat(60));

  return lines.join("\n");
}
