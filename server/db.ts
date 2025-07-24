import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

const connectionString = process.env.SUPABASE_CONNEXION_STRING || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_CONNEXION_STRING or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Attempting to connect to Supabase database');
console.log('Connection string format:', connectionString.replace(/:([^@]*?)@/, ':***@'));

// Configure postgres client with proper settings for Supabase
console.log('Creating database client...');

const client = postgres(connectionString, { 
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