import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeEligibility, assessEligibility, catalogKey, CanonicalEligibilitySchema, assessStoredEligibility } from "../src/lib/scholarships/eligibility";
import { FundingSchema } from "../src/lib/scholarships/funding";
import { educationSummary } from "../src/lib/profiles/education";
const catalog = JSON.parse(readFileSync("data/seed/_merged.clean.json", "utf8")) as { name: string; provider_name: string; source: string; last_verified_at: string | null; amount_min: number; amount_max: number | null; eligibility: unknown; funding?: unknown; status: string }[];
const now = new Date("2026-10-08T12:00:00Z");
const education = { version: 1, educationLevel: "graduate", highestDegree: "bachelor", targetDegree: "master", alumniSchools: ["ACU"], targetSchools: ["ACU", "GCU"], studyMode: "online" };
test("catalog has one identity per award and canonical restrictions", () => {
  assert.equal(new Set(catalog.map((s) => catalogKey(s.name, s.provider_name))).size, catalog.length);
  for (const award of catalog) { assert.equal(CanonicalEligibilitySchema.safeParse(award.eligibility).success, true, award.name); if (award.funding) assert.equal(FundingSchema.safeParse(award.funding).success, true, award.name); }
  assert.equal(catalog.filter((s) => s.name.includes("Program for Continuing Education")).length, 1);
});
test("catalog does not manufacture verification dates for existing imports", () => assert.ok(catalog.filter((s) => s.last_verified_at === null).length > 250));
test("real ACU discount remains conditional while an MSW applicant considers two schools", () => {
  const award = catalog.find((s) => s.name === "ACU Alumni Tuition Discount")!;
  const result = assessStoredEligibility({ education_profile: education }, award, now);
  assert.equal(result.status, "needs_information"); assert.ok(result.missingFields.includes("schoolSelection"));
});
test("AAUW certificate funding excludes an MSW", () => {
  const award = catalog.find((s) => s.name === "AAUW Career Development Grants")!;
  assert.equal(assessStoredEligibility({ education_profile: education, gender: "woman" }, award, now).status, "ineligible");
});
test("P.E.O. grant retains timing, sponsorship and previous-degree restrictions", () => {
  const award = catalog.find((s) => s.name.includes("Program for Continuing Education"))!;
  const rules = normalizeEligibility(award.eligibility);
  assert.equal(rules.gapMonthsMin, 24); assert.equal(rules.completionMonthsMax, 18);
  assert.ok(rules.excludedDegrees.includes("master")); assert.ok(rules.sponsorships.length);
  assert.notEqual(assessStoredEligibility({ education_profile: education, gender: "woman" }, award, now).status, "eligible");
});
test("school-specific placements exclude unrelated schools", () => {
  const award = catalog.find((s) => s.name === "UTA Title IV-E MSW Stipend")!;
  assert.equal(assessStoredEligibility({ education_profile: education, intended_major: "Social Work" }, award, now).status, "ineligible");
});
test("academic summaries omit sensitive and free-form adult fields", () => {
  const summary = educationSummary({ ...education, birthDate: "1980-03-04", workExperience: "private work", employerName: "private employer", caregivingResponsibilities: ["private family"], citizenship: "private citizenship", sponsorships: ["private sponsor"], memberships: ["private membership"], priorField: "private field" });
  assert.ok(summary.includes("master")); assert.equal(summary.includes("private"), false); assert.equal(summary.includes("1980"), false); assert.equal(summary.includes("ACU"), false);
});
test("malformed recognized restrictions remain unknown instead of disappearing", () => {
  for (const eligibility of [{ min_gpa: "ask provider" }, { financial_need: "Must demonstrate need" }, { grade_levels: 12 }, { age_min: "35 years" }]) {
    const result = assessEligibility({ educationProfile: education }, { eligibility, source: "https://example.org", lastVerifiedAt: now }, now);
    assert.equal(result.status, "needs_information", JSON.stringify(eligibility));
  }
});
test("numeric graduation years are enforced and unknown high-school grade is unresolved", () => {
  const award = { source: "https://example.org", lastVerifiedAt: now };
  assert.equal(assessEligibility({ graduationYear: 2026 }, { ...award, eligibility: { graduation_years: [2027] } }, now).status, "ineligible");
  assert.equal(assessEligibility({ educationProfile: { version: 1, educationLevel: "high_school" } }, { ...award, eligibility: { grade_levels: ["senior"] } }, now).status, "needs_information");
});

test("citizenship punctuation is normalized and unfamiliar prose needs confirmation", () => {
  const award = { eligibility: { citizenship_statuses: ["us_citizen"] }, source: "https://example.org", lastVerifiedAt: now };
  assert.equal(assessEligibility({ educationProfile: { ...education, citizenship: "U.S. citizen" } }, award, now).status, "eligible");
  assert.equal(assessEligibility({ educationProfile: { ...education, citizenship: "Permanent resident" } }, award, now).status, "needs_information");
});

import { validateScholarship } from "../src/lib/scholarships/data-loader";
test("both seed paths reject inconsistent amounts, invalid deadlines, and future verification", () => {
  const base = { name: "Fixture", provider_name: "Fixture", amount_min: 1000 };
  assert.equal(validateScholarship({ ...base, amount_max: 500 }).success, false);
  assert.equal(validateScholarship({ ...base, deadline: "not a date" }).success, false);
  assert.equal(validateScholarship({ ...base, last_verified_at: "2999-01-01T00:00:00Z" }).success, false);
});
