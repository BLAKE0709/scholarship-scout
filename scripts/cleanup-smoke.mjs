// Remove smoke-test orphans (public.users rows whose auth.users parent is gone).
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  const gone = await sql`
    DELETE FROM users WHERE email LIKE 'smoke-test-%@example.com' RETURNING email`;
  console.log("orphans removed:", gone.length);
} finally {
  await sql.end();
}
