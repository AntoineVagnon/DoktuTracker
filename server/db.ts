import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

const connectionString = process.env.SUPABASE_CONNEXION_STRING || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_CONNEXION_STRING or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Connecting to Supabase database via pooler');
console.log('Connection string format:', connectionString.replace(/:([^@]*?)@/, ':***@'));

// Force pooler connection if old format is detected
const poolerConnectionString = connectionString.includes('db.hzmrkvooqjbxptqjqxii.supabase.co')
  ? 'postgresql://postgres.hzmrkvooqjbxptqjqxii:kDa2KgKJv9K3w8yY@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
  : connectionString;

// Configure postgres client with proper settings for Supabase
console.log('Creating database client...');

const client = postgres(poolerConnectionString, { 
  prepare: false,
  ssl: 'require', // Force SSL for Supabase
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notices
});

export const db = drizzle(client, { schema });

// Test connection asynchronously
client`SELECT 1`.then(() => {
  console.log('✓ Database connection verified');
}).catch((err) => {
  console.error('✗ Database connection failed:', err.message);
  console.error('Error code:', err.code);
  console.error('Note: Please verify your Supabase credentials are correct');
});