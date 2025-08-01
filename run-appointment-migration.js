import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    console.log('Running appointment reschedule/cancel migration...');
    
    // Add new fields to appointments table
    await db.execute(sql`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
      ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES doctor_time_slots(id),
      ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 35.00
    `);
    
    console.log('✅ Added columns to appointments table');
    
    // Create appointment_changes table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS appointment_changes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        action VARCHAR(255) NOT NULL,
        actor_id INTEGER REFERENCES users(id),
        actor_role VARCHAR(255),
        reason TEXT,
        before JSONB,
        after JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Created appointment_changes table');
    
    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_appointment_changes_appointment_id ON appointment_changes(appointment_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_appointment_changes_created_at ON appointment_changes(created_at)
    `);
    
    console.log('✅ Created indexes');
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();