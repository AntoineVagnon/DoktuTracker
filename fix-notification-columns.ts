import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function fixNotificationColumns() {
  console.log("Starting to fix notification columns...");
  
  try {
    // Add missing column to notification_templates
    console.log("Adding auto_dismiss_seconds column to notification_templates...");
    await db.execute(sql`
      ALTER TABLE notification_templates 
      ADD COLUMN IF NOT EXISTS auto_dismiss_seconds INTEGER DEFAULT 10
    `);
    console.log("✅ Added auto_dismiss_seconds column");
    
    // Add missing column to notification_audit_log
    console.log("Adding timestamp column to notification_audit_log...");
    await db.execute(sql`
      ALTER TABLE notification_audit_log 
      ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `);
    console.log("✅ Added timestamp column");
    
    console.log("✅ Successfully fixed all notification columns!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing notification columns:", error);
    process.exit(1);
  }
}

fixNotificationColumns();