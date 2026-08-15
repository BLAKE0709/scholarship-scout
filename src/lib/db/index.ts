import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Supabase transaction-mode pooler (port 6543): prepare must stay false, and
// serverless instances must not hoard client connections — session mode's
// 15-client cap caused EMAXCONNSESSION outages during deploy churn.
const client = postgres(connectionString, {
  prepare: false,
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
