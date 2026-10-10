import test from "node:test";
import assert from "node:assert/strict";
import { filterEligible } from "../src/lib/scholarships/matching-engine";
const student = { id: "fixture", userId: "fixture", gpa: null, gpaScale: "4", satScore: null, actScore: null, graduationYear: 2027, state: "TX", city: null, gradeLevel: "senior", intendedMajor: null, interests: [], extracurriculars: [], ethnicity: null, gender: null, firstGeneration: null, financialNeed: null };
const award = { id: "graduate", name: "Graduate-only fixture", description: null, amountMin: 1000, amountMax: null, deadline: null, eligibility: { education_level: ["graduate"] }, requirements: {}, renewable: false, national: true, states: [], tags: [] };
test("education_level prevents graduate awards from matching high-school students", () => {
  assert.equal(filterEligible(student, [award]).length, 0);
});

import { assessEligibility, normalizeEligibility } from "../src/lib/scholarships/eligibility";
import { formatFunding } from "../src/lib/scholarships/funding";
import { EducationProfileSchema, educationSummary, profileCompleteness } from "../src/lib/profiles/education";
const now = new Date("2026-10-08T12:00:00Z");
const verified = { ...award, source: "https://example.org/award", lastVerifiedAt: "2026-10-08T00:00:00Z", status: "active" };
const adult = { ...student, gradeLevel: null, graduationYear: null, gpa: "3.5", intendedMajor: "Social Work", gender: "woman", educationProfile: { version: 1 as const, educationLevel: "graduate" as const, highestDegree: "bachelor" as const, targetDegree: "master" as const, priorField: "Liberal arts", alumniSchools: ["ACU"], targetSchools: ["Abilene Christian University"], enrollmentStatus: "planning" as const, studyMode: "online" as const, attendance: "part_time" as const } };
const status = (rules: unknown, profile = adult) => assessEligibility(profile, { ...verified, eligibility: rules }, now).status;
test("Synthetic online MSW fixture meets a verified general graduate award", () => assert.equal(status({ education_level: ["graduate"], majors: ["Social Work"] }), "eligible"));
test("legacy aliases and canonical normalization give identical answers", () => {
  const rules = { education_level: ["current-undergrad"], grade_levels: ["college-junior", "college-senior"], gpa_min: 3 };
  const undergraduate = { ...student, gradeLevel: "college_junior", gpa: "3.4" };
  assert.equal(assessEligibility(undergraduate, { ...verified, eligibility: rules }, now).status, "eligible");
  assert.deepEqual(assessEligibility(undergraduate, { ...verified, eligibility: rules }, now), assessEligibility(undergraduate, { ...verified, eligibility: normalizeEligibility(rules) }, now));
});
test("both legacy education restrictions apply when both keys exist", () => assert.equal(status({ grade_levels: ["graduate"], education_level: ["undergraduate"] }), "ineligible"));
test("missing GPA is unknown; weighted GPA is not silently rescaled", () => {
  assert.equal(status({ gpa_min: 3 }, { ...adult, gpa: null } as unknown as typeof adult), "needs_information");
  assert.equal(status({ gpa_min: 3 }, { ...adult, gpaScale: "5" }), "needs_information");
});
test("exact gender matching never treats male as female", () => assert.equal(status({ gender: ["female"] }, { ...adult, gender: "male" }), "ineligible"));
test("known school, mode, attendance, degree and field exclusions are hard gates", () => {
  for (const rules of [{ schools: ["GCU"] }, { study_modes: ["on_campus"] }, { attendance: ["full_time"] }, { excluded_degrees: ["bachelor"] }, { majors: ["Nursing"] }, { target_degrees: ["bachelor"] }]) assert.equal(status(rules), "ineligible");
});
test("alumni alias matches but two potential schools keep discount conditional", () => {
  assert.equal(status({ alumni_schools: ["Abilene Christian University"], schools: ["ACU"] }), "eligible");
  assert.equal(status({ schools: ["ACU"] }, { ...adult, educationProfile: { ...adult.educationProfile, targetSchools: ["ACU", "GCU"] } }), "needs_information");
});
test("missing citizenship, age, sponsorship, service and complex prose stay unknown", () => {
  for (const rules of [{ citizenship_statuses: ["us_citizen"] }, { age_min: 35 }, { sponsorships: ["PEO chapter recommendation"] }, { service_required: true }, { enrollment: "Accredited placement required" }]) assert.equal(status(rules), "needs_information");
});
test("closed, expired, upcoming and stale awards cannot appear confirmed", () => {
  assert.equal(assessEligibility(adult, { ...verified, status: "closed" }, now).status, "ineligible");
  assert.equal(assessEligibility(adult, { ...verified, deadline: "2026-10-07" }, now).status, "ineligible");
  assert.equal(assessEligibility(adult, { ...verified, status: "upcoming" }, now).status, "needs_information");
  assert.equal(assessEligibility(adult, { ...verified, lastVerifiedAt: "2026-01-01" }, now).status, "needs_information");
});
test("PEO completion timing, education gaps and excluded prior degrees are enforced", () => {
  const rules = { education_gap_months_min: 24, completion_months_max: 18, excluded_degrees: ["master", "doctorate"] };
  assert.equal(status(rules), "needs_information");
  assert.equal(status(rules, { ...adult, educationProfile: { ...adult.educationProfile, educationGapMonths: 12 } } as typeof adult), "ineligible");
  assert.equal(status(rules, { ...adult, educationProfile: { ...adult.educationProfile, completionDate: "2029-01-01" } } as typeof adult), "ineligible");
});
test("percentage discounts and up-to awards have honest amount labels", () => {
  assert.equal(formatFunding(0, null, { kind: "tuition_discount", amountType: "percentage", percentage: 20 }), "20% tuition discount");
  assert.equal(formatFunding(0, 4000, { kind: "grant", amountType: "range" }), "Up to $4,000");
});
test("education schema rejects imaginary dates and reversed program dates", () => {
  assert.equal(EducationProfileSchema.safeParse({ version: 1, birthDate: "1980-02-30" }).success, false);
  assert.equal(EducationProfileSchema.safeParse({ version: 1, startDate: "2027-02-01", completionDate: "2026-02-01" }).success, false);
});
test("adult completeness ignores SAT/ACT and AI summaries omit birth date", () => {
  const p = { ...adult, educationProfile: { ...adult.educationProfile, birthDate: "1980-03-04" } };
  assert.equal(profileCompleteness(p), profileCompleteness({ ...p, satScore: 1600, actScore: 36 }));
  assert.equal(educationSummary(p.educationProfile).includes("1980"), false);
});

import { aiGateway } from "../src/lib/ai/gateway";
import { scoreAffinity } from "../src/lib/scholarships/matching-engine";
test("new education profiles are ranked locally without any AI request", async () => {
  const original = aiGateway.call;
  let calls = 0;
  aiGateway.call = async () => { calls++; throw new Error("No external requests permitted in this test"); };
  try {
    const result = await scoreAffinity(adult, verified);
    assert.equal(calls, 0);
    assert.ok(result.affinityScore >= 50);
    assert.ok(result.assessment);
  } finally { aiGateway.call = original; }
});
