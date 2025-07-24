import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

const connectionString = process.env.SUPABASE_CONNEXION_STRING || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_CONNEXION_STRING or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });