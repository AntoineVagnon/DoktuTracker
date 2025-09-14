import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Connecting to database...');

// Parse connection URL and use discrete connection parameters to avoid URL parsing issues
const u = new URL(connectionString);
const client = postgres({
  host: u.hostname,
  port: Number(u.port) || 5432,
  database: u.pathname.slice(1),
  username: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password || ''),
  ssl: 'require', // Required for Supabase
  prepare: false, // Required for pgbouncer/pooler
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notices
  transform: {
    undefined: null,
  },
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