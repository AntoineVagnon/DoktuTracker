import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

const connectionString = process.env.SUPABASE_CONNEXION_STRING || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_CONNEXION_STRING or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use pooler connection for Supabase - replace the hostname if using old format
const fixedConnectionString = connectionString.includes('db.hzmrkvooqjbxptqjqxii.supabase.co')
  ? connectionString.replace('db.hzmrkvooqjbxptqjqxii.supabase.co:5432', 'aws-0-eu-central-1.pooler.supabase.com:6543')
  : connectionString;

console.log('Connecting to database with pooler connection');

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(fixedConnectionString, { prepare: false });
export const db = drizzle(client, { schema });