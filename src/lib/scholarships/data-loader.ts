import { normalizeEligibility, catalogKey } from "./eligibility";
import { FundingSchema } from "./funding";
import { z } from "zod";
import { db } from "@/lib/db";
import { scholarships, scholarshipProviders } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

const ScholarshipSeedSchema = z.object({
  name: z.string().min(1),
  provider_name: z.string().min(1),
  description: z.string().optional(),
  amount_min: z.number().int().min(0),
  amount_max: z.number().int().nonnegative().nullable().optional(),
  deadline: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid deadline").nullable().optional(),
  last_verified_at: z.string().datetime().nullable().optional(),
  funding: FundingSchema.nullable().optional(),
  eligibility: z.record(z.string(), z.unknown()).optional(),
  requirements: z.record(z.string(), z.unknown()).optional(),
  renewable: z.boolean().optional(),
  national: z.boolean().optional(),
  states: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "closed", "upcoming", "archived"]).optional(),
  application_url: z.string().url().nullable().optional(),
  source: z.string().url().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.amount_max != null && value.amount_max < value.amount_min) ctx.addIssue({ code: "custom", path: ["amount_max"], message: "Maximum amount must be at least the minimum" });
  if (value.last_verified_at && new Date(value.last_verified_at) > new Date()) ctx.addIssue({ code: "custom", path: ["last_verified_at"], message: "Verification cannot be dated in the future" });
});

export type ScholarshipSeed = z.infer<typeof ScholarshipSeedSchema>;

export function validateScholarship(data: unknown): {
  success: boolean;
  data?: ScholarshipSeed;
  error?: string;
} {
  const result = ScholarshipSeedSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues[0]?.message ?? "Validation failed",
  };
}

export async function loadScholarshipsFromJSON(data: unknown[]): Promise<{
  added: number;
  updated: number;
  skipped: number;
  errors: number;
}> {
  const stats = { added: 0, updated: 0, skipped: 0, errors: 0 };

  for (const item of data) {
    const validation = validateScholarship(item);
    if (!validation.success || !validation.data) {
      console.error(`[DataLoader] Invalid scholarship:`, validation.error);
      stats.errors++;
      continue;
    }

    const seed = validation.data;

    try {
      // Upsert provider
      const providerId = await upsertProvider(seed.provider_name);

      // Check for existing scholarship by name + provider
      const providerAwards = await db
        .select({ id: scholarships.id, name: scholarships.name })
        .from(scholarships)
        .where(eq(scholarships.providerId, providerId)).orderBy(asc(scholarships.createdAt), asc(scholarships.id));
      const existing = providerAwards.filter((award) => catalogKey(award.name, seed.provider_name) === catalogKey(seed.name, seed.provider_name));

      if (existing.length > 0) {
        // Update existing
        await db
          .update(scholarships)
          .set({
            name: seed.name,
            description: seed.description,
            amountMin: seed.amount_min,
            amountMax: seed.amount_max,
            deadline: seed.deadline ? new Date(seed.deadline) : null,
            eligibility: normalizeEligibility(seed.eligibility),
            funding: seed.funding ?? null,
            requirements: seed.requirements ?? {},
            renewable: seed.renewable ?? false,
            national: seed.national ?? true,
            states: seed.states ?? [],
            tags: seed.tags ?? [],
            status: seed.status ?? "active",
            applicationUrl: seed.application_url,
            source: seed.source,
            lastVerifiedAt: seed.last_verified_at ? new Date(seed.last_verified_at) : null,
            updatedAt: new Date(),
          })
          .where(eq(scholarships.id, existing[0].id));
        for (const duplicate of existing.slice(1)) await db.update(scholarships).set({ status: "archived", updatedAt: new Date() }).where(eq(scholarships.id, duplicate.id));
        stats.updated++;
      } else {
        // Insert new
        await db.insert(scholarships).values({
          name: seed.name,
          providerId,
          description: seed.description,
          amountMin: seed.amount_min,
          amountMax: seed.amount_max,
          deadline: seed.deadline ? new Date(seed.deadline) : null,
          eligibility: normalizeEligibility(seed.eligibility),
          funding: seed.funding ?? null,
          requirements: seed.requirements ?? {},
          renewable: seed.renewable ?? false,
          national: seed.national ?? true,
          states: seed.states ?? [],
          tags: seed.tags ?? [],
          status: seed.status ?? "active",
          applicationUrl: seed.application_url,
          source: seed.source,
          lastVerifiedAt: seed.last_verified_at ? new Date(seed.last_verified_at) : null,
        });
        stats.added++;
      }
    } catch (error) {
      console.error(`[DataLoader] Failed to load "${seed.name}":`, error);
      stats.errors++;
    }
  }

  console.log(
    `[DataLoader] Import complete: ${stats.added} added, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`,
  );

  return stats;
}

const providerCache = new Map<string, string>();

async function upsertProvider(name: string): Promise<string> {
  if (providerCache.has(name)) {
    return providerCache.get(name)!;
  }

  const existing = await db
    .select({ id: scholarshipProviders.id })
    .from(scholarshipProviders)
    .where(eq(scholarshipProviders.name, name))
    .limit(1);

  if (existing.length > 0) {
    providerCache.set(name, existing[0].id);
    return existing[0].id;
  }

  const [created] = await db
    .insert(scholarshipProviders)
    .values({ name, type: "foundation" })
    .returning({ id: scholarshipProviders.id });

  providerCache.set(name, created.id);
  return created.id;
}
