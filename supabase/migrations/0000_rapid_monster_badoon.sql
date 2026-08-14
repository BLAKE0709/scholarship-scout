CREATE TYPE "public"."achievement_type" AS ENUM('academic', 'athletic', 'community_service', 'leadership', 'arts', 'work_experience', 'award', 'certification', 'other');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'in_progress', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('transcript', 'recommendation_letter', 'certificate', 'financial_aid', 'other');--> statement-breakpoint
CREATE TYPE "public"."essay_status" AS ENUM('draft', 'in_progress', 'review', 'final');--> statement-breakpoint
CREATE TYPE "public"."financial_need" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."grade_level" AS ENUM('freshman', 'sophomore', 'junior', 'senior', 'college_freshman', 'college_sophomore', 'college_junior', 'college_senior');--> statement-breakpoint
CREATE TYPE "public"."institution_type" AS ENUM('school', 'district');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('suggestion', 'question', 'feedback', 'generation', 'revision', 'other');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('new', 'viewed', 'saved', 'applied', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."plan_user_type" AS ENUM('student', 'parent', 'institution');--> statement-breakpoint
CREATE TYPE "public"."provider_type" AS ENUM('foundation', 'corporate', 'community', 'government', 'university', 'other');--> statement-breakpoint
CREATE TYPE "public"."scholarship_status" AS ENUM('active', 'closed', 'upcoming', 'archived');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'paused');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'parent', 'counselor', 'institution_admin', 'provider', 'superadmin');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"type" "achievement_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"organization" text,
	"date_start" date,
	"date_end" date,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"essay_id" uuid,
	"context" text NOT NULL,
	"interaction_type" "interaction_type" NOT NULL,
	"prompt_hash" text NOT NULL,
	"response_hash" text NOT NULL,
	"model_used" text NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"session_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"scholarship_id" uuid NOT NULL,
	"match_id" uuid,
	"status" "application_status" DEFAULT 'draft',
	"submitted_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aps_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"prompt_sophistication" integer NOT NULL,
	"critical_evaluation" integer NOT NULL,
	"creative_integration" integer NOT NULL,
	"iterative_refinement" integer NOT NULL,
	"ethical_awareness" integer NOT NULL,
	"assessment_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "counselor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"school_id" uuid,
	"district_id" uuid,
	"student_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "counselor_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"uploaded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "essay_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"essay_id" uuid NOT NULL,
	"content" text NOT NULL,
	"revision_number" integer NOT NULL,
	"ai_suggestions" jsonb DEFAULT '[]'::jsonb,
	"human_edits" jsonb DEFAULT '[]'::jsonb,
	"word_count" integer DEFAULT 0,
	"time_spent_seconds" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "essays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"application_id" uuid,
	"title" text NOT NULL,
	"content" text DEFAULT '',
	"prompt" text,
	"word_count" integer DEFAULT 0,
	"version" integer DEFAULT 1,
	"fidelity_score" integer,
	"aps_score" integer,
	"status" "essay_status" DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fidelity_baselines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"writing_style_vector" jsonb DEFAULT '{}'::jsonb,
	"vocabulary_profile" jsonb DEFAULT '{}'::jsonb,
	"cadence_metrics" jsonb DEFAULT '{}'::jsonb,
	"sample_count" integer DEFAULT 0,
	"last_calibrated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fidelity_baselines_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "fidelity_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"essay_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"stylistic_consistency" integer NOT NULL,
	"process_authenticity" integer NOT NULL,
	"ai_integration_quality" integer NOT NULL,
	"vocabulary_alignment" integer NOT NULL,
	"conceptual_originality" integer NOT NULL,
	"behavioral_signals" jsonb DEFAULT '{}'::jsonb,
	"model_version" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "institution_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"institution_id" uuid NOT NULL,
	"role" text NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "institution_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "institution_type" NOT NULL,
	"state" text NOT NULL,
	"city" text,
	"student_count" integer DEFAULT 0,
	"plan_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"scholarship_id" uuid NOT NULL,
	"match_score" integer NOT NULL,
	"affinity_score" integer,
	"win_probability" integer,
	"match_reasons" text[] DEFAULT '{}',
	"status" "match_status" DEFAULT 'new',
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"linked_students" uuid[] DEFAULT '{}',
	"notification_prefs" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "parent_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"price_monthly" integer NOT NULL,
	"price_yearly" integer,
	"stripe_price_id_monthly" text,
	"stripe_price_id_yearly" text,
	"user_type" "plan_user_type" NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb,
	"match_limit_monthly" integer,
	"essay_limit_monthly" integer,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scholarship_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "provider_type" NOT NULL,
	"description" text,
	"website" text,
	"contact_email" text,
	"logo_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scholarships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider_id" uuid,
	"description" text,
	"amount_min" integer NOT NULL,
	"amount_max" integer,
	"deadline" timestamp,
	"requirements" jsonb DEFAULT '{}'::jsonb,
	"eligibility" jsonb DEFAULT '{}'::jsonb,
	"application_url" text,
	"status" "scholarship_status" DEFAULT 'active',
	"renewable" boolean DEFAULT false,
	"national" boolean DEFAULT true,
	"states" text[] DEFAULT '{}',
	"tags" text[] DEFAULT '{}',
	"source" text,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gpa" numeric,
	"gpa_scale" numeric DEFAULT '4.0',
	"sat_score" integer,
	"act_score" integer,
	"graduation_year" integer NOT NULL,
	"state" text NOT NULL,
	"city" text,
	"school_name" text,
	"school_id" uuid,
	"grade_level" "grade_level",
	"intended_major" text,
	"interests" text[] DEFAULT '{}',
	"extracurriculars" text[] DEFAULT '{}',
	"ethnicity" text,
	"gender" text,
	"first_generation" boolean,
	"financial_need" "financial_need",
	"vault_health_score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "student_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" "subscription_status" DEFAULT 'active',
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"role" "user_role" DEFAULT 'student',
	"avatar_url" text,
	"onboarding_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_essay_id_essays_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."essays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aps_scores" ADD CONSTRAINT "aps_scores_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counselor_profiles" ADD CONSTRAINT "counselor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counselor_profiles" ADD CONSTRAINT "counselor_profiles_school_id_institutions_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counselor_profiles" ADD CONSTRAINT "counselor_profiles_district_id_institutions_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essay_revisions" ADD CONSTRAINT "essay_revisions_essay_id_essays_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essays" ADD CONSTRAINT "essays_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essays" ADD CONSTRAINT "essays_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fidelity_baselines" ADD CONSTRAINT "fidelity_baselines_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fidelity_scores" ADD CONSTRAINT "fidelity_scores_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fidelity_scores" ADD CONSTRAINT "fidelity_scores_essay_id_essays_id_fk" FOREIGN KEY ("essay_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_profiles" ADD CONSTRAINT "institution_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_profiles" ADD CONSTRAINT "institution_profiles_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_profiles" ADD CONSTRAINT "parent_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_provider_id_scholarship_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."scholarship_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_school_id_institutions_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_interactions_student_created" ON "ai_interactions" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_analytics_user_event_created" ON "analytics_events" USING btree ("user_id","event_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_essays_student_status" ON "essays" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "idx_fidelity_scores_student_essay" ON "fidelity_scores" USING btree ("student_id","essay_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_matches_student_scholarship" ON "matches" USING btree ("student_id","scholarship_id");--> statement-breakpoint
CREATE INDEX "idx_matches_student_status" ON "matches" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "idx_scholarships_deadline" ON "scholarships" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "idx_scholarships_status" ON "scholarships" USING btree ("status");