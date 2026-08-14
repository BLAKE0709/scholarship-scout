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

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export class AIGateway {
  async call(
    request: AIGatewayRequest,
    userTier: UserTier = "free",
  ): Promise<AIGatewayResponse> {
    const { purpose, prompt, context, userId, studentId, essayId } = request;

    // 1. Rate limit check
    if (userId) {
      const rateResult = checkRateLimit(userId, userTier);
      if (!rateResult.allowed) {
        throw new AIGatewayError(
          `Rate limit exceeded. You have ${rateResult.remaining} calls remaining. Resets at ${rateResult.resetAt.toISOString()}.`,
          429,
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
      const message =
        error instanceof Error ? error.message : "Unknown AI error";
      throw new AIGatewayError(
        `AI service temporarily unavailable. Please try again in a moment. (${message})`,
        503,
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

export class AIGatewayError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AIGatewayError";
    this.statusCode = statusCode;
  }
}

// Singleton instance
export const aiGateway = new AIGateway();
