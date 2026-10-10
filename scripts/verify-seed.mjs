// Offline gate: normalize restrictions, retain verification dates, and deduplicate.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { require as tsRequire } from "tsx/cjs/api";
const { normalizeEligibility, catalogKey } = tsRequire("../src/lib/scholarships/eligibility.ts", import.meta.url);
const { FundingSchema } = tsRequire("../src/lib/scholarships/funding.ts", import.meta.url);
const directory = "data/seed";
const now = new Date();
const seen = new Map();
const rejects = [];
let duplicates = 0, closed = 0;
const files = readdirSync(directory).filter((file) => file.endsWith(".json") && !file.startsWith("_")).sort();
for (const file of files) {
  let records;
  try { records = JSON.parse(readFileSync(path.join(directory, file), "utf8")); }
  catch (error) { rejects.push(`${file}: ${error.message}`); continue; }
  if (!Array.isArray(records)) { rejects.push(`${file}: expected an array`); continue; }
  for (const input of records) {
    const problems = [];
    if (!input || typeof input !== "object") { rejects.push(`${file}: invalid record`); continue; }
    if (typeof input.name !== "string" || !input.name.trim()) problems.push("missing name");
    if (typeof input.provider_name !== "string" || !input.provider_name.trim()) problems.push("missing provider");
    if (!Number.isInteger(input.amount_min) || input.amount_min < 0) problems.push("invalid amount_min");
    if (input.amount_max != null && (!Number.isInteger(input.amount_max) || input.amount_max < input.amount_min)) problems.push("invalid amount_max");
    for (const key of ["source", "application_url"]) if ((key === "source" || input[key]) && !/^https?:\/\//.test(input[key] ?? "")) problems.push(`invalid ${key}`);
    if (input.status && !["active", "upcoming", "closed", "archived"].includes(input.status)) problems.push("invalid status");
    if (input.deadline && Number.isNaN(new Date(input.deadline).getTime())) problems.push("invalid deadline");
    if (input.last_verified_at && (Number.isNaN(new Date(input.last_verified_at).getTime()) || new Date(input.last_verified_at) > now)) problems.push("invalid verification date");
    const funding = input.funding == null ? null : FundingSchema.safeParse(input.funding);
    if (funding && !funding.success) problems.push("invalid funding terms");
    if (problems.length) { rejects.push(`${file}: ${input.name}: ${problems.join("; ")}`); continue; }
    const record = { ...input, eligibility: normalizeEligibility(input.eligibility), last_verified_at: input.last_verified_at ?? null };
    if (funding?.success) record.funding = funding.data;
    if (record.deadline && new Date(record.deadline) < now && ["active", "upcoming"].includes(record.status ?? "active")) { record.status = "closed"; closed++; }
    const key = catalogKey(record.name, record.provider_name);
    const old = seen.get(key);
    if (old) {
      duplicates++;
      const currentDate = new Date(record.last_verified_at ?? 0).getTime();
      const oldDate = new Date(old.last_verified_at ?? 0).getTime();
      if (currentDate > oldDate) seen.set(key, record);
      else if (currentDate === oldDate && JSON.stringify(old.eligibility) !== JSON.stringify(record.eligibility)) {
        old.eligibility.unresolved = [...new Set([...old.eligibility.unresolved, "Conflicting duplicate source records require provider verification."])];
        old.last_verified_at = null;
      }
    } else seen.set(key, record);
  }
}
if (rejects.length) { console.error(rejects.join("\n")); process.exit(1); }
const clean = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(path.join(directory, "_merged.clean.json"), JSON.stringify(clean, null, 2) + "\n");
console.log(`${files.length} files; ${clean.length} normalized records; ${duplicates} duplicates merged; ${closed} expired cycles closed; 0 rejects.`);
console.log("Importing a record never advances its source-verification date.");
