#!/usr/bin/env tsx

import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function createConsentTables() {
  try {
    console.log("🔧 Creating consent management tables...");
    
    // Create user_consents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_consents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) NOT NULL,
        consent_type VARCHAR NOT NULL,
        legal_basis VARCHAR NOT NULL,
        consent_given BOOLEAN NOT NULL DEFAULT false,
        consent_date TIMESTAMP NOT NULL DEFAULT NOW(),
        consent_withdrawn_date TIMESTAMP,
        document_version VARCHAR NOT NULL,
        ip_address VARCHAR,
        user_agent TEXT,
        purposes TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("✅ user_consents table created");
    
    // Create gdpr_data_processing_records table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gdpr_data_processing_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id),
        processing_purpose VARCHAR NOT NULL,
        legal_basis VARCHAR NOT NULL,
        data_categories JSONB,
        retention_period VARCHAR,
        recipients JSONB,
        security_measures JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("✅ gdpr_data_processing_records table created");
    
    // Create legal_documents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS legal_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_type VARCHAR NOT NULL,
        version VARCHAR NOT NULL,
        content TEXT NOT NULL,
        effective_date TIMESTAMP NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("✅ legal_documents table created");
    
    console.log("✅ All consent management tables created successfully!");
    
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

createConsentTables();