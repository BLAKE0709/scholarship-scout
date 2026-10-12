import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FundingSchema } from "../src/lib/scholarships/funding";
import { assessStoredEligibility } from "../src/lib/scholarships/eligibility";

const catalog = JSON.parse(readFileSync("data/seed/08-adult-graduate.json", "utf8")) as Record<string, unknown>[];
const now = new Date("2026-10-10T23:59:59Z");
const profile = {
  intended_major: "Social Work",
  education_profile: {
    version: 1, educationLevel: "graduate", highestDegree: "bachelor",
    targetDegree: "master", targetSchools: ["GCU"], studyMode: "online",
  },
};

test("funding terms retain a validated next action through parsing", () => {
  const terms = { kind: "employer_assistance", amountType: "varies", nextStep: "  Confirm the employer agreement and MSW eligibility.  " };
  const parsed = FundingSchema.parse(terms);
  assert.equal((parsed as Record<string, unknown>).nextStep, terms.nextStep.trim());
  assert.equal(FundingSchema.safeParse({ ...terms, nextStep: "  " }).success, false);
});

test("GCU alliance lead does not promise a graduate scholarship without provider confirmation", () => {
  const award = catalog.find((entry) => entry.name === "GCU Employer and Organization Alliance Scholarships");
  assert.ok(award, "The researched GCU alliance route must be available");
  const assessment = assessStoredEligibility(profile, award, now);
  assert.equal(assessment.status, "needs_information");
  assert.ok(assessment.missingFields.includes("providerRequirements"));
  assert.equal((award.funding as Record<string, unknown>).amountType, "varies");
  assert.equal(award.amount_max, null);
  assert.equal(assessStoredEligibility({ ...profile, education_profile: { ...profile.education_profile, targetSchools: ["ACU"] } }, award, now).status, "ineligible");
});

test("ACU employer discount needs partner verification and excludes unrelated schools", () => {
  const award = catalog.find((entry) => entry.name === "ACU Corporate Partner Tuition Discount");
  assert.ok(award, "The researched employer discount must be available");
  const acuProfile = { ...profile, education_profile: { ...profile.education_profile, targetSchools: ["ACU"], employerName: "An unverified employer" } };
  const assessment = assessStoredEligibility(acuProfile, award, now);
  assert.equal(assessment.status, "needs_information");
  assert.ok(assessment.missingFields.includes("providerRequirements"));
  assert.equal(assessStoredEligibility(profile, award, now).status, "ineligible");
});

test("the researched MSW list retains all 18 opportunities for planning before enrollment", () => {
  const shortlist = catalog.filter((entry) => (entry.tags as string[]).includes("msw-funding-list"));
  assert.equal(shortlist.length, 18);
  for (const entry of shortlist) {
    assert.ok(FundingSchema.parse(entry.funding).nextStep, String(entry.name));
    assert.ok(entry.source && entry.application_url, String(entry.name));
    assert.ok((entry.tags as string[]).some((tag) => ["funding-start", "funding-later", "funding-alternative"].includes(tag)), String(entry.name));
    const assessment = assessStoredEligibility({ ...profile, state: "TX", education_profile: { ...profile.education_profile, educationLevel: "not_enrolled", enrollmentStatus: "planning" } }, entry, new Date("2026-10-12T02:00:00Z"));
    assert.notEqual(assessment.status, "eligible", String(entry.name) + " must not promise eligibility with unanswered requirements");
  }
});

test("the expanded list keeps county, organizing, enrollment and school gates visible", () => {
  const expected = [
    ["EWI Dallas ASIST Scholarship", "Dallas"],
    ["AAUW San Antonio Graduate Scholarship", "Bexar"],
    ["Davis-Putter Scholarship Fund", "organizing"],
    ["The Melanie Foundation Scholarship", "enrolled"],
    ["Ima Hogg Scholarship", "Texas-based"],
  ];
  for (const [name, condition] of expected) {
    const entry = catalog.find((item) => item.name === name);
    assert.ok(entry, name + " must be available for planning");
    assert.ok(JSON.stringify(entry.eligibility).includes(condition), name + ": missing " + condition + " gate");
  }
});
