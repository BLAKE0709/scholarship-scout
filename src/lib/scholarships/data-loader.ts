import { z } from "zod";
import { db } from "@/lib/db";
import { scholarships, scholarshipProviders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const ScholarshipSeedSchema = z.object({
  name: z.string().min(1),
  provider_name: z.string().min(1),
  description: z.string().optional(),
  amount_min: z.number().min(0),
  amount_max: z.number().optional(),
  deadline: z.string().optional(),
  eligibility: z.record(z.string(), z.unknown()).optional(),
  requirements: z.record(z.string(), z.unknown()).optional(),
  renewable: z.boolean().optional(),
  national: z.boolean().optional(),
  states: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "closed", "upcoming", "archived"]).optional(),
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
      const existing = await db
        .select({ id: scholarships.id })
        .from(scholarships)
        .where(
          and(
            eq(scholarships.name, seed.name),
            eq(scholarships.providerId, providerId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(scholarships)
          .set({
            description: seed.description,
            amountMin: seed.amount_min,
            amountMax: seed.amount_max,
            deadline: seed.deadline ? new Date(seed.deadline) : null,
            eligibility: seed.eligibility ?? {},
            requirements: seed.requirements ?? {},
            renewable: seed.renewable ?? false,
            national: seed.national ?? true,
            states: seed.states ?? [],
            tags: seed.tags ?? [],
            status: seed.status ?? "active",
            updatedAt: new Date(),
          })
          .where(eq(scholarships.id, existing[0].id));
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
          eligibility: seed.eligibility ?? {},
          requirements: seed.requirements ?? {},
          renewable: seed.renewable ?? false,
          national: seed.national ?? true,
          states: seed.states ?? [],
          tags: seed.tags ?? [],
          status: seed.status ?? "active",
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
