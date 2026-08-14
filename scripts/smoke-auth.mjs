// Backend smoke test: admin-create a user, verify the 0002 auth trigger
// auto-populated public.users, then clean up. Proves auth + trigger + DB chain.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

config({ path: ".env.local" });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const email = `smoke-test-${Date.now()}@example.com`;
try {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: "Smoke Test", role: "student" },
  });
  if (error) throw error;
  const uid = data.user.id;
  console.log("auth user created:", uid.slice(0, 8) + "…");

  await new Promise((r) => setTimeout(r, 1500));
  const rows = await sql`SELECT id, email, role FROM users WHERE id = ${uid}`;
  console.log(
    rows.length
      ? `TRIGGER OK — public.users row exists (role=${rows[0].role})`
      : "TRIGGER FAILED — no public.users row",
  );

  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) throw delErr;
  const after = await sql`SELECT 1 FROM users WHERE id = ${uid}`;
  console.log(
    after.length === 0
      ? "cleanup OK (cascade held)"
      : "cleanup: users row remains — check FK cascade",
  );
} finally {
  await sql.end();
}
