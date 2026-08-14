// Verification gate for research-agent seed files. NOTHING enters the DB
// without passing this: schema shape, deadline sanity, URL presence, dedupe.
// Usage: node scripts/verify-seed.mjs   (reads data/seed/*.json)
// Output: data/seed/_merged.clean.json + console report. Exits 1 on any reject
// so the seeder can't run on a dirty batch by accident.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SEED_DIR = "data/seed";
const TODAY = new Date("2026-08-14");
const STATUSES = new Set(["active", "closed", "upcoming", "archived"]);

const files = readdirSync(SEED_DIR)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .sort();

const seen = new Map(); // key -> file (dedupe across categories)
const clean = [];
const rejects = [];

for (const f of files) {
  let arr;
  try {
    arr = JSON.parse(readFileSync(path.join(SEED_DIR, f), "utf8"));
  } catch (e) {
    rejects.push({
      file: f,
      name: "(whole file)",
      reason: `JSON parse: ${e.message}`,
    });
    continue;
  }
  if (!Array.isArray(arr)) {
    rejects.push({ file: f, name: "(whole file)", reason: "not a JSON array" });
    continue;
  }
  for (const s of arr) {
    const problems = [];
    if (!s?.name || typeof s.name !== "string") problems.push("missing name");
    if (!s?.provider_name || typeof s.provider_name !== "string")
      problems.push("missing provider_name");
    if (!Number.isFinite(s?.amount_min) || s.amount_min < 0)
      problems.push("bad amount_min");
    if (
      s.amount_max != null &&
      (!Number.isFinite(s.amount_max) || s.amount_max < s.amount_min)
    )
      problems.push("amount_max < amount_min");
    if (!s?.source || !/^https?:\/\//.test(s.source))
      problems.push("missing/invalid source URL (verification trail required)");
    if (s.application_url && !/^https?:\/\//.test(s.application_url))
      problems.push("invalid application_url");
    if (s.status && !STATUSES.has(s.status))
      problems.push(`bad status ${s.status}`);
    if (s.deadline != null) {
      const d = new Date(s.deadline);
      if (isNaN(d)) problems.push(`unparseable deadline ${s.deadline}`);
      else if (d < TODAY && (s.status ?? "active") === "active")
        problems.push(
          `deadline ${s.deadline} already passed but status=active`,
        );
    } else if ((s.status ?? "active") === "active") {
      // Active with no deadline = rolling; allow but require the description to say so-ish.
      if (!s.description)
        problems.push("active with no deadline and no description");
    }

    const key =
      `${s.name}`.toLowerCase().trim() +
      "::" +
      `${s.provider_name}`.toLowerCase().trim();
    if (seen.has(key)) problems.push(`duplicate of entry in ${seen.get(key)}`);

    if (problems.length) {
      rejects.push({
        file: f,
        name: s?.name ?? "(unnamed)",
        reason: problems.join("; "),
      });
    } else {
      seen.set(key, f);
      clean.push(s);
    }
  }
}

writeFileSync(
  path.join(SEED_DIR, "_merged.clean.json"),
  JSON.stringify(clean, null, 2),
);

console.log(`files: ${files.length}`);
console.log(`clean records: ${clean.length} -> ${SEED_DIR}/_merged.clean.json`);
console.log(`rejects: ${rejects.length}`);
for (const r of rejects) console.log(`  [${r.file}] ${r.name}: ${r.reason}`);

const withDeadline = clean.filter((s) => s.deadline).length;
const active = clean.filter((s) => (s.status ?? "active") === "active").length;
const texas = clean.filter((s) => (s.states ?? []).includes("TX")).length;
console.log(
  `stats: ${active} active, ${withDeadline} with hard deadlines, ${texas} TX-specific`,
);

process.exit(rejects.length ? 1 : 0);
