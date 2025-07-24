import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Build connection string from Replit PostgreSQL environment variables
const connectionString = process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE
  ? `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Database connection info must be set. Did you forget to provision a database?",
  );
}

console.log('Connecting to Replit PostgreSQL database');
console.log('Connection string format:', connectionString.replace(/:([^@]*?)@/, ':***@'));

// Configure postgres client with proper settings
console.log('Creating database client...');

const client = postgres(connectionString, { 
  prepare: false,
  ssl: connectionString.includes('neon.tech') ? 'require' : false, // Neon requires SSL
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