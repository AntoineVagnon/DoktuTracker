// Cleanup script to remove user from local database
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function cleanup() {
  try {
    console.log('Looking for user antoine.vagnon@gmail.com...');
    
    // Find and delete user from local database
    const result = await db.delete(users)
      .where(eq(users.email, 'antoine.vagnon@gmail.com'))
      .returning();
    
    if (result.length > 0) {
      console.log('Deleted user from local database:', result[0]);
    } else {
      console.log('No user found in local database');
    }
    
    console.log('Cleanup completed');
  } catch (error) {
    console.error('Cleanup error:', error);
  } finally {
    await client.end();
  }
}

cleanup();