/**
 * Syncs DATABASE_URL from .env.local to Vercel production.
 *
 * Companion to set-anthropic-key.mjs: the value never passes through chat,
 * shell history, or a command argument — it is read from .env.local, which is
 * gitignored. Run after changing the database URL locally:
 *
 *   node scripts/set-database-url.mjs
 *
 * Then redeploy: npx vercel --prod --yes
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const line = readFileSync(".env.local", "utf8")
  .split(/\r?\n/)
  .find((l) => l.startsWith("DATABASE_URL="));

if (!line) {
  console.error("No DATABASE_URL in .env.local");
  process.exit(1);
}

const url = line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "").trim();

if (!url.startsWith("postgresql://")) {
  console.error("DATABASE_URL does not look like a postgres URL.");
  process.exit(1);
}

// Serverless must use the transaction pooler (6543) — session mode's
// 15-client cap caused the EMAXCONNSESSION outage on 2026-08-14.
if (!/pooler\.supabase\.com:6543\//.test(url)) {
  console.error(
    "Refusing: DATABASE_URL is not the Supabase transaction pooler (port 6543).",
  );
  process.exit(1);
}

execSync("npx vercel env add DATABASE_URL production --force", {
  input: url,
  stdio: ["pipe", "ignore", "ignore"],
});
console.log(
  "Pushed DATABASE_URL (transaction pooler, port 6543) to Vercel production.",
);
console.log("\nNow redeploy so the running app picks it up:");
console.log("  npx vercel --prod --yes");
