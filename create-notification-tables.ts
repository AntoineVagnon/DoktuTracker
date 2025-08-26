import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function createNotificationTables() {
  console.log("Creating notification tables...");
  
  try {
    // Create notification_templates table
    console.log("Creating notification_templates table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id SERIAL PRIMARY KEY,
        trigger_code VARCHAR(100) UNIQUE NOT NULL,
        template_name VARCHAR(255) NOT NULL,
        description TEXT,
        channel VARCHAR(50) NOT NULL,
        priority_level INTEGER DEFAULT 3,
        template_content JSONB,
        variables JSONB,
        frequency_cap_hours INTEGER,
        batch_window_minutes INTEGER,
        auto_dismiss_seconds INTEGER DEFAULT 10,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created notification_templates table");
    
    // Create notification_queue table
    console.log("Creating notification_queue table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_queue (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        trigger_code VARCHAR(100) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        priority_level INTEGER DEFAULT 3,
        template_data JSONB,
        scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        last_attempt_at TIMESTAMP WITH TIME ZONE,
        sent_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created notification_queue table");
    
    // Create notification_audit_log table
    console.log("Creating notification_audit_log table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_audit_log (
        id SERIAL PRIMARY KEY,
        notification_id INTEGER,
        user_id INTEGER,
        trigger_code VARCHAR(100),
        channel VARCHAR(50),
        event_type VARCHAR(50),
        event_data JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created notification_audit_log table");
    
    // Create user_notification_preferences table
    console.log("Creating user_notification_preferences table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        channel VARCHAR(50) NOT NULL,
        trigger_code VARCHAR(100),
        enabled BOOLEAN DEFAULT true,
        frequency_cap_override INTEGER,
        quiet_hours_start TIME,
        quiet_hours_end TIME,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, channel, trigger_code)
      )
    `);
    console.log("✅ Created user_notification_preferences table");
    
    // Create notification_batch table
    console.log("Creating notification_batch table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_batch (
        id SERIAL PRIMARY KEY,
        batch_key VARCHAR(255) UNIQUE NOT NULL,
        channel VARCHAR(50) NOT NULL,
        scheduled_for TIMESTAMP WITH TIME ZONE,
        notification_ids INTEGER[],
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        processed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log("✅ Created notification_batch table");
    
    console.log("✅ Successfully created all notification tables!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating notification tables:", error);
    process.exit(1);
  }
}

createNotificationTables();