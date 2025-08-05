import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function addPhoneColumn() {
  try {
    console.log('Adding phone column to users table...');
    
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(255)
    `);
    
    console.log('✅ Phone column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding phone column:', error);
    process.exit(1);
  }
}

addPhoneColumn();
