// Apply the search_path pin to the already-created trigger function.
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  await sql`ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp`;
  const [row] = await sql`
    SELECT proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'`;
  console.log("proconfig now:", row.proconfig);
} finally {
  await sql.end();
}
