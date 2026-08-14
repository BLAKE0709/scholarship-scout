// Adversarial RLS probe: two real users through the anon-key client.
// PASS means: each sees own data, neither sees the other's, catalog is
// readable, and cross-user writes are rejected.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const mk = (n) => ({
  email: `rls-probe-${n}-${stamp}@example.com`,
  password: `Probe!${stamp}${n}x`,
});
const A = mk("a");
const B = mk("b");

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`,
  );
  if (!ok) failures++;
};

// 1. Create both users (trigger builds users + student_profiles rows)
const created = [];
for (const u of [A, B]) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: "RLS Probe", role: "student" },
  });
  if (error) throw error;
  u.id = data.user.id;
  created.push(u.id);
}
await new Promise((r) => setTimeout(r, 1200));

// 2. Sign in as B with the anon client
const clientB = createClient(URL, ANON, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error: loginErr } = await clientB.auth.signInWithPassword({
  email: B.email,
  password: B.password,
});
if (loginErr) throw loginErr;

// 3. Probes as B
{
  const { data } = await clientB.from("users").select("id").eq("id", A.id);
  check("B cannot read A's user row", (data ?? []).length === 0);
}
{
  const { data } = await clientB.from("users").select("id").eq("id", B.id);
  check("B can read own user row", (data ?? []).length === 1);
}
{
  const { data } = await clientB
    .from("student_profiles")
    .select("id,user_id")
    .eq("user_id", A.id);
  check("B cannot read A's student profile", (data ?? []).length === 0);
}
{
  const { data } = await clientB.from("scholarships").select("id").limit(3);
  check("B can read scholarship catalog", (data ?? []).length === 3);
}
{
  const { data } = await clientB.from("essays").select("id").limit(5);
  check("B sees no essays but their own (none)", (data ?? []).length === 0);
}
{
  const { error } = await clientB
    .from("users")
    .update({ full_name: "hacked" })
    .eq("id", A.id);
  const { data: after } = await admin
    .from("users")
    .select("full_name")
    .eq("id", A.id)
    .single();
  check(
    "B cannot update A's user row",
    (after?.full_name ?? "") !== "hacked",
    error ? "update errored (fine)" : "update no-oped",
  );
}
{
  const { error } = await clientB.from("notifications").insert({
    user_id: A.id,
    type: "system",
    title: "spam",
    body: "spam",
  });
  check("B cannot insert notifications for A", !!error);
}
{
  const { data } = await clientB.from("link_codes").select("code").limit(1);
  check("B cannot enumerate link codes", (data ?? []).length === 0);
}
{
  const { data } = await clientB.from("analytics_events").select("id").limit(1);
  check("B cannot read analytics_events", (data ?? []).length === 0);
}

// 4. Cleanup
for (const id of created) await admin.auth.admin.deleteUser(id);
await admin.from("users").delete().in("id", created);

console.log(
  failures === 0 ? "\nALL RLS PROBES PASS" : `\n${failures} PROBE(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
