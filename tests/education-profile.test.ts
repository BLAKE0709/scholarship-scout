import test from "node:test";
import assert from "node:assert/strict";
import { basicsSchema } from "../src/lib/validators/onboarding";
test("graduate applicants do not need an undergraduate grade or fabricated graduation year", () => {
  assert.equal(basicsSchema.safeParse({ fullName: "Adult fixture", state: "TX", gradeLevel: null, graduationYear: null, educationProfile: { version: 1, educationLevel: "graduate", highestDegree: "bachelor", targetDegree: "master" } }).success, true);
});
test("existing high-school senior basics remain valid", () => {
  assert.equal(basicsSchema.safeParse({ fullName: "Student fixture", state: "TX", gradeLevel: "senior", graduationYear: 2027 }).success, true);
});
