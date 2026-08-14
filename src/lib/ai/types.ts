import { z } from "zod";

// ── Purpose Enum ──────────────────────────────────────────────────────────────

export const AI_PURPOSES = [
  "match_scoring",
  "essay_feedback",
  "fidelity_analysis",
  "aps_assessment",
  "essay_deep_review",
  "chat_assistant",
  "scholarship_analysis",
] as const;

export type AIPurpose = (typeof AI_PURPOSES)[number];

// ── Model Routing ─────────────────────────────────────────────────────────────

// Tiered by purpose: cheap+fast for high-volume scoring, frontier Sonnet for
// the flagship essay/fidelity work, Opus only where correctness beats cost.
export const PURPOSE_MODEL_MAP: Record<AIPurpose, string> = {
  match_scoring: "claude-haiku-4-5",
  essay_feedback: "claude-sonnet-5",
  fidelity_analysis: "claude-sonnet-5",
  aps_assessment: "claude-sonnet-5",
  essay_deep_review: "claude-opus-5",
  chat_assistant: "claude-haiku-4-5",
  scholarship_analysis: "claude-haiku-4-5",
};

// ── Request / Response ────────────────────────────────────────────────────────

export interface AIGatewayRequest {
  purpose: AIPurpose;
  prompt: string;
  context?: Record<string, unknown>;
  userId?: string;
  studentId?: string;
  essayId?: string;
}

export interface AIGatewayResponse {
  content: string;
  model: string;
  tokens: number;
  cached: boolean;
}

// ── Zod Schemas ───────────────────────────────────────────────────────────────

export const AIGatewayRequestSchema = z.object({
  purpose: z.enum(AI_PURPOSES),
  prompt: z.string().min(1).max(50000),
  context: z.record(z.string(), z.unknown()).optional(),
  userId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  essayId: z.string().uuid().optional(),
});

// ── AI Response Schemas (for parsing structured JSON from AI) ─────────────────

export const MatchScoringResponseSchema = z.object({
  affinity_score: z.number().min(0).max(100),
  reasons: z.array(z.string()).min(1).max(5),
  concerns: z.array(z.string()).max(3),
});

export type MatchScoringResponse = z.infer<typeof MatchScoringResponseSchema>;

export const FidelityAnalysisResponseSchema = z.object({
  stylistic_consistency: z.number().min(0).max(100),
  process_authenticity: z.number().min(0).max(100),
  ai_integration_quality: z.number().min(0).max(100),
  vocabulary_alignment: z.number().min(0).max(100),
  conceptual_originality: z.number().min(0).max(100),
  stylistic_consistency_rationale: z.string(),
  process_authenticity_rationale: z.string(),
  ai_integration_quality_rationale: z.string(),
  vocabulary_alignment_rationale: z.string(),
  conceptual_originality_rationale: z.string(),
});

export type FidelityAnalysisResponse = z.infer<
  typeof FidelityAnalysisResponseSchema
>;

export const APSAssessmentResponseSchema = z.object({
  prompt_sophistication: z.number().min(0).max(100),
  critical_evaluation: z.number().min(0).max(100),
  creative_integration: z.number().min(0).max(100),
  iterative_refinement: z.number().min(0).max(100),
  ethical_awareness: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  examples: z.record(z.string(), z.string()),
});

export type APSAssessmentResponse = z.infer<typeof APSAssessmentResponseSchema>;

export const ScholarshipAnalysisResponseSchema = z.object({
  name: z.string(),
  provider: z.string(),
  amount_min: z.number(),
  amount_max: z.number().optional(),
  deadline: z.string().optional(),
  eligibility: z.object({
    min_gpa: z.number().optional(),
    states: z.array(z.string()).optional(),
    grade_levels: z.array(z.string()).optional(),
    majors: z.array(z.string()).optional(),
    demographics: z.array(z.string()).optional(),
    financial_need: z.boolean().optional(),
    other_requirements: z.array(z.string()).optional(),
  }),
  requirements: z.object({
    essays_required: z.number().optional(),
    recommendation_letters: z.number().optional(),
    transcript: z.boolean().optional(),
    other: z.array(z.string()).optional(),
  }),
  renewable: z.boolean(),
  geographic_restrictions: z.array(z.string()).optional(),
});

export type ScholarshipAnalysisResponse = z.infer<
  typeof ScholarshipAnalysisResponseSchema
>;

// ── Rate Limiter Types ────────────────────────────────────────────────────────

export type UserTier = "free" | "pro" | "counselor" | "admin";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

// ── Interaction Type Mapping ──────────────────────────────────────────────────

export const PURPOSE_TO_INTERACTION_TYPE: Record<AIPurpose, string> = {
  match_scoring: "suggestion",
  essay_feedback: "feedback",
  fidelity_analysis: "feedback",
  aps_assessment: "feedback",
  essay_deep_review: "feedback",
  chat_assistant: "question",
  scholarship_analysis: "suggestion",
};
