// Seed the scholarships + scholarship_providers tables from the verified
// merge produced by verify-seed.mjs. Mirrors src/lib/scholarships/data-loader.ts
// semantics (upsert by name+provider) but runs standalone against DATABASE_URL.
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

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
      eligibility: sql.json(s.eligibility ?? {}),
      requirements: sql.json(s.requirements ?? {}),
      renewable: s.renewable ?? false,
      national: s.national ?? true,
      states: s.states ?? [],
      tags: s.tags ?? [],
      status: s.status ?? "active",
      application_url: s.application_url ?? null,
      source: s.source ?? null,
      last_verified_at: s.source ? new Date() : null,
    };
    const existing = await sql`
      SELECT id FROM scholarships WHERE name = ${s.name} AND provider_id = ${pid} LIMIT 1`;
    if (existing.length) {
      await sql`UPDATE scholarships SET ${sql({ ...vals, updated_at: new Date() })} WHERE id = ${existing[0].id}`;
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
