import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  decimal,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "student",
  "parent",
  "counselor",
  "institution_admin",
  "provider",
  "superadmin",
]);

export const gradeLevelEnum = pgEnum("grade_level", [
  "freshman",
  "sophomore",
  "junior",
  "senior",
  "college_freshman",
  "college_sophomore",
  "college_junior",
  "college_senior",
]);

export const financialNeedEnum = pgEnum("financial_need", [
  "low",
  "medium",
  "high",
]);

export const institutionTypeEnum = pgEnum("institution_type", [
  "school",
  "district",
]);

export const scholarshipStatusEnum = pgEnum("scholarship_status", [
  "active",
  "closed",
  "upcoming",
  "archived",
]);

export const providerTypeEnum = pgEnum("provider_type", [
  "foundation",
  "corporate",
  "community",
  "government",
  "university",
  "other",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "new",
  "viewed",
  "saved",
  "applied",
  "dismissed",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "in_progress",
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "withdrawn",
]);

export const essayStatusEnum = pgEnum("essay_status", [
  "draft",
  "in_progress",
  "review",
  "final",
]);

export const achievementTypeEnum = pgEnum("achievement_type", [
  "academic",
  "athletic",
  "community_service",
  "leadership",
  "arts",
  "work_experience",
  "award",
  "certification",
  "other",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "transcript",
  "recommendation_letter",
  "certificate",
  "financial_aid",
  "other",
]);

export const interactionTypeEnum = pgEnum("interaction_type", [
  "suggestion",
  "question",
  "feedback",
  "generation",
  "revision",
  "other",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "paused",
]);

export const planUserTypeEnum = pgEnum("plan_user_type", [
  "student",
  "parent",
  "institution",
]);

export const familyLinkStatusEnum = pgEnum("family_link_status", [
  "pending",
  "active",
  "revoked",
]);

export const linkMethodEnum = pgEnum("link_method", ["email", "code"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "deadline_warning",
  "match_new",
  "application_update",
  "score_updated",
  "nudge",
  "system",
  "achievement",
]);

// ── Tables ───────────────────────────────────────────────────────────────────

// 20. plans (defined first because institutions FK to it)
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  priceMonthly: integer("price_monthly").notNull(),
  priceYearly: integer("price_yearly"),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdYearly: text("stripe_price_id_yearly"),
  userType: planUserTypeEnum("user_type").notNull(),
  features: jsonb("features").default({}),
  matchLimitMonthly: integer("match_limit_monthly"),
  essayLimitMonthly: integer("essay_limit_monthly"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 1. users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  fullName: text("full_name"),
  role: userRoleEnum("role").default("student"),
  avatarUrl: text("avatar_url"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 6. institutions
export const institutions = pgTable("institutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: institutionTypeEnum("type").notNull(),
  state: text("state").notNull(),
  city: text("city"),
  studentCount: integer("student_count").default(0),
  planId: uuid("plan_id").references(() => plans.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. student_profiles
export const studentProfiles = pgTable("student_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  gpa: decimal("gpa"),
  gpaScale: decimal("gpa_scale").default("4.0"),
  satScore: integer("sat_score"),
  actScore: integer("act_score"),
  graduationYear: integer("graduation_year").notNull(),
  state: text("state").notNull(),
  city: text("city"),
  schoolName: text("school_name"),
  schoolId: uuid("school_id").references(() => institutions.id),
  gradeLevel: gradeLevelEnum("grade_level"),
  intendedMajor: text("intended_major"),
  interests: text("interests").array().default([]),
  extracurriculars: text("extracurriculars").array().default([]),
  ethnicity: text("ethnicity"),
  gender: text("gender"),
  firstGeneration: boolean("first_generation"),
  financialNeed: financialNeedEnum("financial_need"),
  vaultHealthScore: integer("vault_health_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. parent_profiles
export const parentProfiles = pgTable("parent_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  linkedStudents: uuid("linked_students").array().default([]),
  notificationPrefs: jsonb("notification_prefs").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 4. counselor_profiles
export const counselorProfiles = pgTable("counselor_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  schoolId: uuid("school_id").references(() => institutions.id),
  districtId: uuid("district_id").references(() => institutions.id),
  studentCount: integer("student_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 5. institution_profiles
export const institutionProfiles = pgTable("institution_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  institutionId: uuid("institution_id")
    .references(() => institutions.id)
    .notNull(),
  role: text("role").notNull(),
  permissions: jsonb("permissions").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 8. scholarship_providers
export const scholarshipProviders = pgTable("scholarship_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: providerTypeEnum("type").notNull(),
  description: text("description"),
  website: text("website"),
  contactEmail: text("contact_email"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 7. scholarships
export const scholarships = pgTable(
  "scholarships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    providerId: uuid("provider_id").references(() => scholarshipProviders.id),
    description: text("description"),
    amountMin: integer("amount_min").notNull(),
    amountMax: integer("amount_max"),
    deadline: timestamp("deadline"),
    requirements: jsonb("requirements").default({}),
    eligibility: jsonb("eligibility").default({}),
    applicationUrl: text("application_url"),
    status: scholarshipStatusEnum("status").default("active"),
    renewable: boolean("renewable").default(false),
    national: boolean("national").default(true),
    states: text("states").array().default([]),
    tags: text("tags").array().default([]),
    source: text("source"),
    lastVerifiedAt: timestamp("last_verified_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_scholarships_deadline").on(table.deadline),
    index("idx_scholarships_status").on(table.status),
  ],
);

// 9. matches
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .references(() => studentProfiles.id, { onDelete: "cascade" })
      .notNull(),
    scholarshipId: uuid("scholarship_id")
      .references(() => scholarships.id, { onDelete: "cascade" })
      .notNull(),
    matchScore: integer("match_score").notNull(),
    affinityScore: integer("affinity_score"),
    winProbability: integer("win_probability"),
    matchReasons: text("match_reasons").array().default([]),
    status: matchStatusEnum("status").default("new"),
    appliedAt: timestamp("applied_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_matches_student_scholarship").on(
      table.studentId,
      table.scholarshipId,
    ),
    index("idx_matches_student_status").on(table.studentId, table.status),
  ],
);

// 10. applications
export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .references(() => studentProfiles.id, { onDelete: "cascade" })
    .notNull(),
  scholarshipId: uuid("scholarship_id")
    .references(() => scholarships.id, { onDelete: "cascade" })
    .notNull(),
  matchId: uuid("match_id").references(() => matches.id),
  status: applicationStatusEnum("status").default("draft"),
  submittedAt: timestamp("submitted_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 11. essays
export const essays = pgTable(
  "essays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .references(() => studentProfiles.id, { onDelete: "cascade" })
      .notNull(),
    applicationId: uuid("application_id").references(() => applications.id),
    title: text("title").notNull(),
    content: text("content").default(""),
    prompt: text("prompt"),
    wordCount: integer("word_count").default(0),
    version: integer("version").default(1),
    fidelityScore: integer("fidelity_score"),
    apsScore: integer("aps_score"),
    status: essayStatusEnum("status").default("draft"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_essays_student_status").on(table.studentId, table.status),
  ],
);

// 12. essay_revisions
export const essayRevisions = pgTable("essay_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  essayId: uuid("essay_id")
    .references(() => essays.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  revisionNumber: integer("revision_number").notNull(),
  aiSuggestions: jsonb("ai_suggestions").default([]),
  humanEdits: jsonb("human_edits").default([]),
  wordCount: integer("word_count").default(0),
  timeSpentSeconds: integer("time_spent_seconds").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// 13. achievements
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .references(() => studentProfiles.id, { onDelete: "cascade" })
    .notNull(),
  type: achievementTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  organization: text("organization"),
  dateStart: date("date_start"),
  dateEnd: date("date_end"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 14. documents
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .references(() => studentProfiles.id, { onDelete: "cascade" })
    .notNull(),
  type: documentTypeEnum("type").notNull(),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 15. fidelity_scores
export const fidelityScores = pgTable(
  "fidelity_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .references(() => studentProfiles.id, { onDelete: "cascade" })
      .notNull(),
    essayId: uuid("essay_id")
      .references(() => essays.id, { onDelete: "cascade" })
      .notNull(),
    score: integer("score").notNull(),
    stylisticConsistency: integer("stylistic_consistency").notNull(),
    processAuthenticity: integer("process_authenticity").notNull(),
    aiIntegrationQuality: integer("ai_integration_quality").notNull(),
    vocabularyAlignment: integer("vocabulary_alignment").notNull(),
    conceptualOriginality: integer("conceptual_originality").notNull(),
    behavioralSignals: jsonb("behavioral_signals").default({}),
    modelVersion: text("model_version").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_fidelity_scores_student_essay").on(
      table.studentId,
      table.essayId,
    ),
  ],
);

// 16. fidelity_baselines
export const fidelityBaselines = pgTable("fidelity_baselines", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .references(() => studentProfiles.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  writingStyleVector: jsonb("writing_style_vector").default({}),
  vocabularyProfile: jsonb("vocabulary_profile").default({}),
  cadenceMetrics: jsonb("cadence_metrics").default({}),
  sampleCount: integer("sample_count").default(0),
  lastCalibratedAt: timestamp("last_calibrated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 17. aps_scores
export const apsScores = pgTable("aps_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .references(() => studentProfiles.id, { onDelete: "cascade" })
    .notNull(),
  score: integer("score").notNull(),
  promptSophistication: integer("prompt_sophistication").notNull(),
  criticalEvaluation: integer("critical_evaluation").notNull(),
  creativeIntegration: integer("creative_integration").notNull(),
  iterativeRefinement: integer("iterative_refinement").notNull(),
  ethicalAwareness: integer("ethical_awareness").notNull(),
  assessmentDate: timestamp("assessment_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 18. ai_interactions
export const aiInteractions = pgTable(
  "ai_interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .references(() => studentProfiles.id, { onDelete: "cascade" })
      .notNull(),
    essayId: uuid("essay_id").references(() => essays.id),
    context: text("context").notNull(),
    interactionType: interactionTypeEnum("interaction_type").notNull(),
    promptHash: text("prompt_hash").notNull(),
    responseHash: text("response_hash").notNull(),
    modelUsed: text("model_used").notNull(),
    tokensUsed: integer("tokens_used").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_ai_interactions_student_created").on(
      table.studentId,
      table.createdAt,
    ),
  ],
);

// 19. subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  planId: uuid("plan_id")
    .references(() => plans.id)
    .notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: subscriptionStatusEnum("status").default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 22. family_links
export const familyLinks = pgTable(
  "family_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    studentId: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    status: familyLinkStatusEnum("status").default("pending"),
    linkMethod: linkMethodEnum("link_method").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_family_links_parent_student").on(
      table.parentId,
      table.studentId,
    ),
  ],
);

// 23. link_codes
export const linkCodes = pgTable("link_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  code: text("code").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// 24. counselor_students
export const counselorStudents = pgTable(
  "counselor_students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    counselorId: uuid("counselor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    studentId: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_counselor_students_unique").on(
      table.counselorId,
      table.studentId,
    ),
  ],
);

// 25. notifications
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    actionUrl: text("action_url"),
    metadata: jsonb("metadata").default({}),
    read: boolean("read").default(false),
    emailed: boolean("emailed").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_read_created").on(
      table.userId,
      table.read,
      table.createdAt,
    ),
  ],
);

// 21. analytics_events
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").default({}),
    sessionId: text("session_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_analytics_user_event_created").on(
      table.userId,
      table.eventType,
      table.createdAt,
    ),
  ],
);
