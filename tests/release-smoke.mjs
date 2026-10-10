// Explicit live release check. Uses disposable synthetic accounts; never sends email.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

if (!process.argv.includes("--run")) throw new Error("Run explicitly with: node tests/release-smoke.mjs --run");
config({ path: ".env.local", quiet: true });
const origin = process.env.RELEASE_SMOKE_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL;
const target = new URL(origin);
const configured = new URL(process.env.NEXT_PUBLIC_APP_URL);
if (target.origin !== configured.origin && !["localhost", "127.0.0.1"].includes(target.hostname)) {
  throw new Error("Smoke target must be the configured app or localhost.");
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const created = [];
const check = (result) => { if (result.error) throw result.error; return result.data; };

async function account(label) {
  const email = "release-" + label + "-" + randomBytes(8).toString("hex") + "@example.com";
  const password = randomBytes(24).toString("base64url");
  const user = check(await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: "Temporary release test", role: "student" },
  })).user;
  created.push({ id: user.id, email });
  const jar = new Map();
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  check(await client.auth.signInWithPassword({ email, password }));
  const profile = check(await client.from("student_profiles").select("id").eq("user_id", user.id).single());
  check(await client.from("users").update({ onboarding_completed: true }).eq("id", user.id).select("id").single());
  async function request(path, options = {}) {
    const response = await fetch(new URL(path, origin), {
      redirect: "manual", ...options,
      headers: { Cookie: [...jar].map(([name, value]) => name + "=" + value).join("; "), "Content-Type": "application/json", ...options.headers },
      signal: AbortSignal.timeout(90000),
    });
    const text = await response.text();
    assert.ok(response.ok, path + " returned HTTP " + response.status + ": " + text.slice(0, 200));
    return { status: response.status, text, json: () => JSON.parse(text) };
  }
  return { client, user, profile, request };
}

try {
  const adult = await account("graduate");
  const education = {
    version: 1, educationLevel: "graduate", highestDegree: "bachelor", targetDegree: "master",
    alumniSchools: ["ACU"], targetSchools: ["ACU", "GCU"], studyMode: "online", enrollmentStatus: "planning",
    workExperience: "Synthetic prior teaching experience for a release test",
  };
  const saved = check(await adult.client.from("student_profiles").update({
    state: "TX", grade_level: null, graduation_year: null, education_profile: education,
    intended_major: "Social Work", gpa: "3.50", gpa_scale: "4.00", sat_score: null, act_score: null,
  }).eq("id", adult.profile.id).select("education_profile,graduation_year,intended_major").single());
  assert.equal(saved.education_profile.targetDegree, "master");
  assert.equal(saved.graduation_year, null);
  console.log("PASS: owner can save a graduate profile without school grade/year.");

  const refreshed = (await adult.request("/api/scholarships/match", { method: "POST" })).json();
  assert.ok(refreshed.matchCount > 0);
  const awards = check(await adult.client.from("scholarships").select("id,name,funding").in("name", [
    "ACU Alumni Tuition Discount", "GCU Employer and Organization Alliance Scholarships",
  ]));
  assert.equal(awards.length, 2);
  const acu = awards.find((award) => award.name === "ACU Alumni Tuition Discount");
  assert.equal(acu.funding.percentage, 20);
  const matched = check(await adult.client.from("matches").select("id,status,eligibility_status,eligibility_missing_fields").eq("student_id", adult.profile.id).eq("scholarship_id", acu.id).single());
  assert.equal(matched.status, "new");
  assert.equal(matched.eligibility_status, "needs_information");
  assert.ok(matched.eligibility_missing_fields.includes("schoolSelection"));
  console.log("PASS: graduate matching returns researched routes and conditional school eligibility.");

  // AppShell waits for browser auth hydration before rendering client cards.
  // Browser QA covers the interactive filters and displayed discount separately.
  const page = await adult.request("/scholarships");
  assert.ok(page.text.includes("Graduate funding"), "Funding page must show the graduate heading");
  assert.ok(page.text.includes("GCU Employer and Organization Alliance Scholarships"), "Funding page must include the GCU route");
  console.log("PASS: authenticated funding route responds with graduate heading and employer opportunity data.");

  const application = (await adult.request("/api/applications", {
    method: "POST", body: JSON.stringify({ scholarshipId: acu.id, matchId: matched.id, notes: "Temporary release verification" }),
  })).json().data;
  assert.ok(application.id);
  check(await adult.client.from("student_profiles").update({
    education_profile: { ...education, targetSchools: ["GCU"], attendance: null },
  }).eq("id", adult.profile.id).select("id").single());
  await adult.request("/api/scholarships/match", { method: "POST" });
  const retained = check(await adult.client.from("applications").select("id,match_id").eq("id", application.id).single());
  assert.equal(retained.match_id, matched.id);
  const reassessed = check(await adult.client.from("matches").select("eligibility_status").eq("id", matched.id).single());
  assert.equal(reassessed.eligibility_status, "ineligible");
  console.log("PASS: refresh preserves an application linked to a new match after eligibility changes.");

  const exported = (await adult.request("/api/vault/export?format=json")).json();
  assert.equal(exported.profile.education_profile.targetDegree, "master");
  assert.equal(exported.applications.find((entry) => entry.id === application.id).amountLabel, "20% tuition discount");
  const textExport = await adult.request("/api/vault/export?format=text");
  assert.ok(textExport.text.includes("20% tuition discount"));
  assert.equal(textExport.text.includes("SAT:"), false);
  console.log("PASS: JSON/text exports preserve graduate profile and funding terms without school-test fields.");

  const legacy = await account("legacy");
  check(await legacy.client.from("student_profiles").update({
    state: "TX", grade_level: "senior", graduation_year: 2027, education_profile: null,
    intended_major: "Biology", gpa: "3.50", gpa_scale: "4.00", sat_score: 1250,
  }).eq("id", legacy.profile.id).select("id").single());
  const oldExport = (await legacy.request("/api/vault/export?format=json")).json();
  assert.equal(oldExport.profile.grade_level, "senior");
  assert.equal(oldExport.profile.graduation_year, 2027);
  assert.equal(oldExport.profile.sat_score, 1250);
  const crossUser = check(await legacy.client.from("student_profiles").select("id").eq("id", adult.profile.id));
  assert.equal(crossUser.length, 0);
  console.log("PASS: legacy student profile/export and cross-user privacy remain intact.");
 } catch (error) {
  console.error("Release smoke failed:", error.message);
  throw error;
} finally {
  const errors = [];
  const cleanup = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    for (const { id, email } of created) {
      // public.users intentionally has no FK to auth.users. Delete only this
      // run's exact synthetic identity, then verify both sides of cleanup.
      try {
        await cleanup`delete from public.users where id = ${id} and email = ${email}`;
        const result = await admin.auth.admin.deleteUser(id);
        if (result.error) throw result.error;
        const remaining = await cleanup`select id from public.users where id = ${id}`;
        if (remaining.length) throw new Error("Temporary public account remains: " + id);
      } catch (error) { errors.push(error.message); }
    }
  } finally { await cleanup.end(); }
  if (errors.length) throw new Error("Release cleanup: " + errors.join("; "));
  console.log("Cleanup verified: all temporary release accounts removed.");
}
