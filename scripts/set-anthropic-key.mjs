/**
 * Installs the Anthropic API key from a file — never from a chat message or a
 * shell argument, so the key never lands in history or a transcript.
 *
 *   1. Create the key at https://console.anthropic.com/settings/keys
 *   2. Save it, alone, into a plain text file (a Desktop .txt is fine)
 *   3. npm run ai:key -- "C:\\Users\\becke_90vhc46\\Desktop\\anthropic-key.txt"
 *
 * Writes it to .env.local, pushes it to Vercel production, and tells you to
 * redeploy. Delete the file afterwards.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const path = process.argv[2];

if (!path) {
  console.error("Usage: npm run ai:key -- <path-to-file-containing-key>");
  process.exit(1);
}

if (!existsSync(path)) {
  console.error(`No file at: ${path}`);
  process.exit(1);
}

const key = readFileSync(path, "utf8").trim();

if (!key.startsWith("sk-ant-")) {
  console.error(
    "That file does not look like an Anthropic key (expected it to start with sk-ant-).",
  );
  process.exit(1);
}

const ENV = ".env.local";
const lines = readFileSync(ENV, "utf8")
  .split(/\r?\n/)
  .filter((l) => !l.startsWith("ANTHROPIC_API_KEY="));
lines.push(`ANTHROPIC_API_KEY=${key}`);
writeFileSync(ENV, lines.filter(Boolean).join("\n") + "\n", "utf8");
console.log(`Wrote ANTHROPIC_API_KEY to ${ENV} (length ${key.length}).`);

try {
  execSync("npx vercel env rm ANTHROPIC_API_KEY production --yes", {
    stdio: "ignore",
  });
} catch {
  // Not previously set — nothing to remove.
}

execSync("npx vercel env add ANTHROPIC_API_KEY production", {
  input: key,
  stdio: ["pipe", "ignore", "ignore"],
});
console.log("Pushed to Vercel production.");

console.log("\nNow redeploy so the running app picks it up:");
console.log("  npx vercel --prod --yes");
console.log("\nThen delete the file you saved the key in.");
