// One-shot migration runner for the resurrected Supabase project.
// Skips 0000_rapid_monster_badoon.sql deliberately: it is a drizzle-generated
// duplicate of 0001_initial_schema.sql (same 21 tables); 0001 is authoritative.
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

// Pass explicit file paths as CLI args to apply just those; with no args,
// runs the original full-restore set (0000 stays excluded as a duplicate).
const DEFAULT_FILES = [
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0002_auth_trigger.sql",
  "supabase/migrations/0003_family_and_counselor_linking.sql",
  "supabase/migrations/0004_notifications.sql",
];
const FILES = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_FILES;

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

try {
  for (const f of FILES) {
    const body = readFileSync(f, "utf8");
    process.stdout.write(`applying ${f} ... `);
    await sql.unsafe(body);
    console.log("OK");
  }
  const [{ count }] = await sql`
    SELECT count(*)::int AS count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
  const [{ count: trig }] = await sql`
    SELECT count(*)::int AS count FROM information_schema.triggers
    WHERE trigger_schema IN ('public','auth')`;
  console.log(`public tables: ${count}, triggers visible: ${trig}`);
} finally {
  await sql.end();
}
