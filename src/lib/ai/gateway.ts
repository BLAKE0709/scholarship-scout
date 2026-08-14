import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { aiInteractions } from "@/lib/db/schema";
import { SYSTEM_PROMPTS } from "./prompts";
import { stripPII } from "./pii-stripper";
import { checkRateLimit } from "./rate-limiter";
import type { AIGatewayRequest, AIGatewayResponse, UserTier } from "./types";
import { PURPOSE_MODEL_MAP, PURPOSE_TO_INTERACTION_TYPE } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * The coach is only usable when a key is actually present. Without this check
 * the SDK throws its own auth error, which used to reach students verbatim as
 * "Could not resolve authentication method..." alongside a false promise to
 * try again. An unset key never resolves itself, so it is its own state.
 */
export function isAIConfigured(): boolean {
  return (process.env.ANTHROPIC_API_KEY ?? "").trim().length > 0;
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export class AIGateway {
  async call(
    request: AIGatewayRequest,
    userTier: UserTier = "free",
  ): Promise<AIGatewayResponse> {
    const { purpose, prompt, context, userId, studentId, essayId } = request;

    // 0. Configuration check — a missing key is a setup state, not an outage
    if (!isAIConfigured()) {
      throw new AIGatewayError(
        "The writing coach is not switched on yet.",
        503,
        "ai_not_configured",
      );
    }

    // 1. Rate limit check
    if (userId) {
      const rateResult = checkRateLimit(userId, userTier);
      if (!rateResult.allowed) {
        throw new AIGatewayError(
          `Rate limit exceeded. You have ${rateResult.remaining} calls remaining. Resets at ${rateResult.resetAt.toISOString()}.`,
          429,
          "rate_limited",
        );
      }
    }

    // 2. Strip PII from the prompt
    const { text: sanitizedPrompt } = stripPII(prompt);

    // 3. Build the message with context
    let userMessage = sanitizedPrompt;
    if (context) {
      const contextStr = Object.entries(context)
        .map(
          ([key, val]) =>
            `${key}: ${typeof val === "string" ? val : JSON.stringify(val)}`,
        )
        .join("\n");
      userMessage = `${contextStr}\n\n${sanitizedPrompt}`;
    }

    // 4. Determine model and system prompt
    const model = PURPOSE_MODEL_MAP[purpose];
    const systemPrompt = SYSTEM_PROMPTS[purpose];

    // 5. Call Anthropic with retry
    let response: Anthropic.Message;
    try {
      response = await this.callWithRetry(model, systemPrompt, userMessage);
    } catch (error) {
      if (error instanceof AIGatewayError) throw error;
      // Internal detail stays server-side; students never see SDK text.
      console.error("[AI Gateway] call failed", {
        purpose,
        model,
        error: error instanceof Error ? error.message : error,
      });
      throw new AIGatewayError(
        "The writing coach could not be reached just now. Your draft is saved — try again in a moment.",
        503,
        "ai_unavailable",
      );
    }

    // 6. Extract content and token usage
    const content =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const totalTokens = inputTokens + outputTokens;

    // 7. Log interaction to database
    if (studentId) {
      try {
        const interactionType = PURPOSE_TO_INTERACTION_TYPE[purpose] as
          | "suggestion"
          | "question"
          | "feedback"
          | "generation"
          | "revision"
          | "other";

        await db.insert(aiInteractions).values({
          studentId,
          essayId: essayId ?? null,
          context: purpose,
          interactionType,
          promptHash: hashText(sanitizedPrompt),
          responseHash: hashText(content),
          modelUsed: model,
          tokensUsed: totalTokens,
        });
      } catch (dbError) {
        console.error("[AI Gateway] Failed to log interaction:", dbError);
        // Don't fail the request if logging fails
      }
    }

    return {
      content,
      model,
      tokens: totalTokens,
      cached: false,
    };
  }

  private async callWithRetry(
    model: string,
    systemPrompt: string,
    userMessage: string,
    retries = 1,
  ): Promise<Anthropic.Message> {
    try {
      return await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
    } catch (error: unknown) {
      const status =
        error instanceof Anthropic.APIError ? error.status : undefined;
      if (retries > 0 && (status === 500 || status === 529)) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.callWithRetry(
          model,
          systemPrompt,
          userMessage,
          retries - 1,
        );
      }
      throw error;
    }
  }
}

export type AIGatewayErrorCode =
  "ai_not_configured" | "rate_limited" | "ai_unavailable";

export class AIGatewayError extends Error {
  public statusCode: number;
  public code: AIGatewayErrorCode;

  constructor(
    message: string,
    statusCode: number,
    code: AIGatewayErrorCode = "ai_unavailable",
  ) {
    super(message);
    this.name = "AIGatewayError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Singleton instance
export const aiGateway = new AIGateway();
