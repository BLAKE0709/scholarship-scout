# WO-4: Adult and graduate funding

Approved by Blake's ?EXECUTE!? following the six-part design on 2026-10-08.

Support adults returning to undergraduate, graduate, doctoral, or certificate study. Preserve existing students. Acceptance uses a synthetic adult applicant comparing online social-work master's programs after a non-BSW bachelor's degree. No personal account data is included or inferred.

## File contract
Orchestrator: src/lib/profiles/education.ts; src/lib/db/schema.ts; supabase/migrations/0007_adult_graduate_support.sql (new only); src/lib/scholarships/{eligibility,funding,matching-engine,match-scheduler,data-loader}.ts; src/lib/ai/{prompts,types}.ts; src/app/api/ai/route.ts; src/lib/vault/exporter.ts; src/app/(dashboard)/scholarships/**; src/components/scholarships/**; src/lib/dashboard/data-fetchers.ts; src/app/(dashboard)/dashboard/page.tsx; src/app/api/scholarships/match/route.ts; src/components/dashboard/student-dashboard.tsx; scripts/{run-tests.mjs,verify-seed.mjs,seed-scholarships.mjs}; data/seed/*.json; tests/**; package.json; docs/work-orders/WO-4*; STATE.md; DECISIONS.md; LEARNING.md.
Profile implementer: src/lib/validators/onboarding.ts; src/hooks/use-onboarding.ts; src/components/onboarding/**; src/components/profile/education-fields.tsx; src/app/**/onboarding/page.tsx; src/app/(dashboard)/vault/page.tsx; tests/profile-ui.test.ts.
No new dependencies. No auth, middleware, billing, env changes. No changes to applied migrations. No remote writes, communications, commits, or pushes.

## Data contract
student_profiles.education_profile: nullable JSON EducationProfile v1; graduation_year becomes nullable. Existing legacy grade data remains. New facts optional; unknown is never inferred as false or eligible. Target degree and earned degree are separate. scholarships.funding contains kind, amountType, percentage, amountDescription, applicationCycle, opensOn, deadlineType, fundingTiming, serviceObligation, stackingPolicy, eligibleExpenses. Matches persist eligibility independently of saved/applied workflow status.

EducationProfile: version:1; educationLevel: high_school|undergraduate|graduate|doctoral|certificate|not_enrolled; highestDegree: none|high_school|certificate|associate|bachelor|master|doctorate; targetDegree: certificate|associate|bachelor|master|doctorate; priorField; alumniSchools:string[]; targetSchools:string[]; enrollmentStatus: planning|applied|accepted|enrolled; attendance: full_time|part_time; studyMode: online|on_campus|hybrid; startDate,completionDate,birthDate (ISO dates); educationGapMonths:number; employmentStatus:string; employerName; workExperience; caregivingResponsibilities:string[]; citizenship:string; serviceCommitment:boolean; memberships,sponsorships:string[]. Except version, fields optional and nullable. Birth date optional, excluded from AI prompts.

Shared exports: EducationProfileSchema, EducationProfile, educationLevelOptions and degreeOptions (value,label arrays), parseEducationProfile(value), isSchoolStudent(education, legacyGrade?), educationSummary(education), profileCompleteness(profile accepting saved snake_case fields).

## Acceptance
Adult onboarding and vault can save/clear education history and goals without fabricated school grade or SAT/ACT. Legacy high-school and undergraduate flows remain usable. Canonical deterministic eligibility handles grade_levels and education_level, hard restrictions, unknowns, stale verification, application cycles, and service obligations. New EducationProfile records are ranked locally. The existing AI path for legacy records ranks affinity only. Saved/applied rows retain workflow and are reassessed. Lists/details/dashboard/exports show honest amounts and eligibility. Catalog includes verified adult/MSW examples, dedupes legacy spelling variants, never claims re-import is verification. No combined guaranteed savings. Tests offline; production build and targeted lint pass. Migration and seed rollout are documented, never silently applied remotely.

Automatic approval review rejected forwarding new adult-profile data to the external AI provider. No new adult-profile context is sent. New EducationProfile records bypass AI entirely and rank locally; coaching language includes adult learners without attaching their stored profile. No authorization for new payload egress is assumed.
