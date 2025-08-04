import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function createAnalyticsTable() {
  try {
    console.log("Creating analytics_events table...");
    
    // Create the table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR NOT NULL,
        user_id INTEGER REFERENCES users(id),
        event_type VARCHAR NOT NULL,
        event_data JSONB,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id)`);
    
    console.log("✅ Analytics table created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating analytics table:", error);
    process.exit(1);
  }
}

createAnalyticsTable();