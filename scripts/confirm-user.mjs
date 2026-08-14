// Admin-confirm a user's email by address (QA use: node scripts/confirm-user.mjs <email>)
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const email = process.argv[2];
if (!email) throw new Error("usage: node scripts/confirm-user.mjs <email>");

const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
if (error) throw error;
const user = data.users.find((u) => u.email === email);
if (!user) throw new Error(`no user with email ${email}`);

const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
  email_confirm: true,
});
if (updErr) throw updErr;
console.log(`confirmed: ${email} (${user.id.slice(0, 8)}…)`);
