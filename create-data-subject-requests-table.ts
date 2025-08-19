#!/usr/bin/env tsx

import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function createDataSubjectRequestsTable() {
  try {
    console.log("Creating data_subject_requests table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS data_subject_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id),
        request_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        description TEXT NOT NULL,
        response TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log("✅ data_subject_requests table created successfully");
    
    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_data_subject_requests_user_id 
      ON data_subject_requests(user_id);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status 
      ON data_subject_requests(status);
    `);
    
    console.log("✅ Indexes created successfully");
    
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    process.exit(0);
  }
}

createDataSubjectRequestsTable();