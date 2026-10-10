import test from "node:test";
import assert from "node:assert/strict";
import { Children, isValidElement, type ReactNode } from "react";
import { EducationFields } from "../src/components/profile/education-fields";
import { Select } from "../src/components/ui/select";
import {
  academicsSchema,
  buildStudentProfileUpdate,
  calculateOnboardingVaultScore,
  educationStepSchema,
  requireUpdatedRow,
  shouldShowSchoolTests,
  usesLegacySchoolFields,
  type OnboardingData,
} from "../src/lib/validators/onboarding";
import { profileCompleteness, type EducationProfile } from "../src/lib/profiles/education";

function selectValues(node: ReactNode): unknown[] {
  const values: unknown[] = [];
  Children.forEach(node, (child) => {
    if (!isValidElement<{ children?: ReactNode; value?: unknown }>(child)) return;
    if (child.type === Select) values.push(child.props.value);
    values.push(...selectValues(child.props.children));
  });
  return values;
}

test("unanswered and cleared education choices stay controlled", () => {
  const profiles: EducationProfile[] = [
    { version: 1 },
    {
      version: 1,
      educationLevel: "high_school",
      highestDegree: null,
      targetDegree: null,
      enrollmentStatus: null,
      attendance: null,
      studyMode: null,
    },
  ];
  for (const value of profiles) {
    const values = selectValues(EducationFields({
      value,
      onChange: () => {},
      legacy: { gradeLevel: null },
      onLegacyChange: () => {},
    }));
    assert.ok(values.length > 0);
    for (const selection of values) {
      assert.equal(typeof selection, "string", "Empty selections must remain controlled after clearing");
    }
  }
});

const graduateData: OnboardingData = {
  basics: {
    fullName: "Adult fixture",
    state: "TX",
    city: "Fort Worth",
    schoolName: null,
    graduationYear: null,
    gradeLevel: null,
    educationProfile: {
      version: 1,
      educationLevel: "graduate",
      highestDegree: "bachelor",
      targetDegree: "master",
      priorField: "Liberal arts",
      alumniSchools: ["Abilene Christian University"],
      targetSchools: ["ACU", "GCU"],
      enrollmentStatus: "planning",
      attendance: "part_time",
      studyMode: "online",
      serviceCommitment: null,
    },
  },
  academics: {
    gpa: 3.8,
    gpaScale: 4,
    satScore: 1400,
    actScore: 30,
    intendedMajor: "Social work",
  },
  aboutYou: { interests: ["Community service"], extracurriculars: [] },
  goals: { goals: ["find_scholarships"] },
};

test("graduate profile updates clear incompatible legacy school fields and test scores", () => {
  const update = buildStudentProfileUpdate(graduateData, 3);
  assert.equal(update.grade_level, null);
  assert.equal(update.graduation_year, null);
  assert.equal(update.school_name, null);
  assert.equal(update.sat_score, null);
  assert.equal(update.act_score, null);
  assert.deepEqual(update.education_profile, graduateData.basics.educationProfile);
});

test("legacy high-school profile updates retain grade, graduation year, and scores", () => {
  const data: OnboardingData = {
    ...graduateData,
    basics: {
      fullName: "Student fixture",
      state: "TX",
      schoolName: "Colleyville Heritage High School",
      graduationYear: 2027,
      gradeLevel: "senior",
      educationProfile: {
        version: 1,
        educationLevel: "high_school",
        highestDegree: "none",
        targetDegree: "bachelor",
      },
    },
  };
  const update = buildStudentProfileUpdate(data, 3);
  assert.equal(update.grade_level, "senior");
  assert.equal(update.graduation_year, 2027);
  assert.equal(update.school_name, "Colleyville Heritage High School");
  assert.equal(update.sat_score, 1400);
  assert.equal(update.act_score, 30);
});

test("stage helpers show legacy and test fields only where they apply", () => {
  assert.equal(usesLegacySchoolFields({ version: 1, educationLevel: "high_school" }), true);
  assert.equal(usesLegacySchoolFields({ version: 1, educationLevel: "undergraduate" }), true);
  assert.equal(usesLegacySchoolFields({ version: 1, educationLevel: "graduate" }), false);
  assert.equal(shouldShowSchoolTests({ version: 1, educationLevel: "doctoral" }), false);
});

test("cleared optional adult facts are written explicitly without invented false values", () => {
  const data: OnboardingData = {
    ...graduateData,
    basics: {
      ...graduateData.basics,
      educationProfile: {
        ...graduateData.basics.educationProfile!,
        employerName: null,
        caregivingResponsibilities: [],
        memberships: [],
        sponsorships: [],
        serviceCommitment: null,
      },
    },
  };
  const update = buildStudentProfileUpdate(data, 2);
  const education = update.education_profile as Record<string, unknown>;
  assert.equal(education.employerName, null);
  assert.deepEqual(education.caregivingResponsibilities, []);
  assert.equal(education.serviceCommitment, null);
});

test("adult vault score uses canonical completeness and ignores SAT and ACT", () => {
  const score = calculateOnboardingVaultScore(graduateData);
  const update = buildStudentProfileUpdate(graduateData, 4);
  assert.equal(score, profileCompleteness(update));
  const withoutScores: OnboardingData = {
    ...graduateData,
    academics: { ...graduateData.academics, satScore: "", actScore: "" },
  };
  assert.equal(calculateOnboardingVaultScore(withoutScores), score);
});
test("education stage changes clear grades from the other legacy stage", () => {
  const undergraduate = educationStepSchema.parse({
    educationProfile: { version: 1, educationLevel: "undergraduate" },
    gradeLevel: "senior",
  });
  const highSchool = educationStepSchema.parse({
    educationProfile: { version: 1, educationLevel: "high_school" },
    gradeLevel: "college_senior",
  });
  assert.equal(undergraduate.gradeLevel, null);
  assert.equal(highSchool.gradeLevel, null);

  const changed: OnboardingData = {
    ...graduateData,
    basics: {
      ...graduateData.basics,
      educationProfile: { version: 1, educationLevel: "undergraduate" },
      gradeLevel: "senior",
    },
  };
  assert.equal(buildStudentProfileUpdate(changed, 2).grade_level, null);
});

test("compatible grades and unknown grade values survive education validation", () => {
  assert.equal(educationStepSchema.parse({
    educationProfile: { version: 1, educationLevel: "high_school" },
    gradeLevel: "senior",
  }).gradeLevel, "senior");
  assert.equal(educationStepSchema.parse({
    educationProfile: { version: 1, educationLevel: "undergraduate" },
    gradeLevel: "college_senior",
  }).gradeLevel, "college_senior");
  assert.equal(educationStepSchema.parse({
    educationProfile: { version: 1, educationLevel: "undergraduate" },
    gradeLevel: null,
  }).gradeLevel, null);
});

test("zero-row updates are rejected before save success is reported", () => {
  assert.throws(
    () => requireUpdatedRow({ data: null, error: null }, "Profile was not found."),
    /Profile was not found/,
  );
  assert.deepEqual(
    requireUpdatedRow({ data: { id: "profile-id" }, error: null }, "Profile was not found."),
    { id: "profile-id" },
  );
});


test("academic edits preserve unrelated profile facts and update missing eligibility information", () => {
  const saved = {
    intended_major: null,
    gpa: null,
    gender: "female",
    ethnicity: "hispanic",
    first_generation: false,
    financial_need: "high",
    interests: ["Community service"],
    extracurriculars: ["Volunteer tutor"],
  };
  const academics = { ...graduateData.academics, gpa: 3.75, intendedMajor: "Social work" };
  assert.equal(academicsSchema.safeParse(academics).success, true);
  const patch = buildStudentProfileUpdate({ ...graduateData, academics }, 3);
  const result = { ...saved, ...patch };
  assert.equal(result.gpa, 3.75);
  assert.equal(result.intended_major, "Social work");
  assert.equal(result.gender, "female");
  assert.equal(result.ethnicity, "hispanic");
  assert.equal(result.first_generation, false);
  assert.equal(result.financial_need, "high");
  assert.deepEqual(result.interests, ["Community service"]);
  assert.deepEqual(result.extracurriculars, ["Volunteer tutor"]);
});

test("clearing optional academics stores unknown instead of a fabricated zero GPA", () => {
  const academics = { gpa: "" as const, gpaScale: 4, intendedMajor: null };
  assert.equal(academicsSchema.safeParse(academics).success, true);
  const patch = buildStudentProfileUpdate({ ...graduateData, academics }, 3);
  assert.equal(patch.gpa, null);
  assert.equal(patch.intended_major, null);
  assert.equal(patch.sat_score, null);
  assert.equal(patch.act_score, null);
});
