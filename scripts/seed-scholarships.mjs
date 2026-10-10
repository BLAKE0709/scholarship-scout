// Seed the scholarships + scholarship_providers tables from the verified
// merge produced by verify-seed.mjs. Mirrors src/lib/scholarships/data-loader.ts
// semantics (upsert by name+provider) but runs standalone against DATABASE_URL.
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";
import { require as tsRequire } from "tsx/cjs/api";
const { normalizeEligibility, catalogKey } = tsRequire("../src/lib/scholarships/eligibility.ts", import.meta.url);
const { FundingSchema } = tsRequire("../src/lib/scholarships/funding.ts", import.meta.url);

config({ path: ".env.local" });
// Match the app: transaction-mode pooling cannot retain prepared statements.
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

const records = JSON.parse(
  readFileSync("data/seed/_merged.clean.json", "utf8"),
);
const stats = { added: 0, updated: 0, errors: 0 };
const providerCache = new Map();

async function providerId(name) {
  if (providerCache.has(name)) return providerCache.get(name);
  const found =
    await sql`SELECT id FROM scholarship_providers WHERE name = ${name} LIMIT 1`;
  if (found.length) {
    providerCache.set(name, found[0].id);
    return found[0].id;
  }
  const [row] = await sql`
    INSERT INTO scholarship_providers (name, type) VALUES (${name}, 'foundation') RETURNING id`;
  providerCache.set(name, row.id);
  return row.id;
}

for (const s of records) {
  try {
    const pid = await providerId(s.provider_name);
    const vals = {
      description: s.description ?? null,
      amount_min: s.amount_min,
      amount_max: s.amount_max ?? null,
      deadline: s.deadline ? new Date(s.deadline) : null,
      eligibility: sql.json(normalizeEligibility(s.eligibility)),
      funding: s.funding ? sql.json(FundingSchema.parse(s.funding)) : null,
      requirements: sql.json(s.requirements ?? {}),
      renewable: s.renewable ?? false,
      national: s.national ?? true,
      states: s.states ?? [],
      tags: s.tags ?? [],
      status: s.status ?? "active",
      application_url: s.application_url ?? null,
      source: s.source ?? null,
      last_verified_at: s.last_verified_at ? new Date(s.last_verified_at) : null,
    };
    const providerAwards = await sql`SELECT id, name FROM scholarships WHERE provider_id = ${pid} ORDER BY created_at, id`;
    const existing = providerAwards.filter((award) => catalogKey(award.name, s.provider_name) === catalogKey(s.name, s.provider_name));
    if (existing.length) {
      await sql.begin(async (tx) => {
        await tx`UPDATE scholarships SET ${tx({ ...vals, name: s.name, updated_at: new Date() })} WHERE id = ${existing[0].id}`;
        for (const duplicate of existing.slice(1)) await tx`UPDATE scholarships SET status = 'archived', updated_at = now() WHERE id = ${duplicate.id}`;
      });
      stats.updated++;
    } else {
      await sql`INSERT INTO scholarships ${sql({ name: s.name, provider_id: pid, ...vals })}`;
      stats.added++;
    }
  } catch (e) {
    console.error(`FAILED "${s.name}": ${e.message}`);
    stats.errors++;
  }
}

const [{ count }] = await sql`SELECT count(*)::int AS count FROM scholarships`;
console.log(
  `added ${stats.added}, updated ${stats.updated}, errors ${stats.errors}; table now holds ${count}`,
);
await sql.end();
process.exit(stats.errors ? 1 : 0);
