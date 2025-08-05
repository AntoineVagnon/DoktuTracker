import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function createNotificationTables() {
  try {
    console.log("Creating notification tables...");
    
    // Create email_notifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) NOT NULL,
        appointment_id INTEGER REFERENCES appointments(id),
        trigger_code VARCHAR NOT NULL,
        template_key VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        priority INTEGER NOT NULL DEFAULT 50,
        scheduled_for TIMESTAMP NOT NULL,
        sent_at TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        merge_data JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create SMS notifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sms_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) NOT NULL,
        appointment_id INTEGER REFERENCES appointments(id),
        trigger_code VARCHAR NOT NULL,
        template_key VARCHAR NOT NULL,
        phone_number VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        scheduled_for TIMESTAMP NOT NULL,
        sent_at TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        merge_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create push notifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS push_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) NOT NULL,
        appointment_id INTEGER REFERENCES appointments(id),
        trigger_code VARCHAR NOT NULL,
        template_key VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        scheduled_for TIMESTAMP NOT NULL,
        sent_at TIMESTAMP,
        error_message TEXT,
        merge_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create notification preferences table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
        email_enabled BOOLEAN DEFAULT true,
        sms_enabled BOOLEAN DEFAULT false,
        push_enabled BOOLEAN DEFAULT false,
        marketing_emails_enabled BOOLEAN DEFAULT true,
        reminder_timing JSONB,
        locale VARCHAR DEFAULT 'en',
        timezone VARCHAR DEFAULT 'Europe/Paris',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_email_notifications_scheduled ON email_notifications(scheduled_for)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_email_notifications_user ON email_notifications(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status)`);
    
    console.log("✅ Notification tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating notification tables:", error);
    process.exit(1);
  }
}

createNotificationTables();