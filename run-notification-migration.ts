#!/usr/bin/env tsx
/**
 * Run the notification system migration
 */

import { db } from "./server/db";
import { sql } from "drizzle-orm";
import fs from "fs";

async function runMigration() {
  try {
    console.log("🔄 Running notification system migration...");
    
    // First, drop and recreate the notification tables with complete schema
    console.log("📊 Creating complete notification system tables...");
    const completeTablesSQL = fs.readFileSync("./create-complete-notification-tables.sql", "utf-8");
    await db.execute(sql.raw(completeTablesSQL));
    console.log("✅ Complete notification tables created successfully!");
    
    // Then, add columns to notification_preferences
    console.log("📊 Adding columns to notification_preferences...");
    const addColumnsSQL = fs.readFileSync("./add-notification-columns.sql", "utf-8");
    await db.execute(sql.raw(addColumnsSQL));
    console.log("✅ Notification preferences columns added successfully!");
    
    console.log("🎉 All notification system migrations completed!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("🎉 Database is ready for Universal Notification System!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration error:", error);
    process.exit(1);
  });