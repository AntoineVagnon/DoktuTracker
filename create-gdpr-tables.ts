#!/usr/bin/env tsx
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function createGDPRTables() {
  try {
    console.log("Creating GDPR compliance tables...");

    // Create Legal Documents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS legal_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_type VARCHAR NOT NULL,
        version VARCHAR NOT NULL,
        content TEXT NOT NULL,
        effective_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);
    console.log("✅ Created legal_documents table");

    // Create User Consents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_consents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) NOT NULL,
        consent_type VARCHAR NOT NULL,
        legal_basis VARCHAR NOT NULL,
        consent_given BOOLEAN NOT NULL,
        consent_date TIMESTAMP NOT NULL,
        consent_withdrawn_date TIMESTAMP,
        document_version VARCHAR NOT NULL,
        ip_address VARCHAR,
        user_agent TEXT
      )
    `);
    console.log("✅ Created user_consents table");

    // Create GDPR Data Processing Records
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gdpr_data_processing_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) NOT NULL,
        processing_purpose VARCHAR NOT NULL,
        legal_basis VARCHAR NOT NULL,
        data_categories JSONB NOT NULL,
        retention_period VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Created gdpr_data_processing_records table");

    // Insert initial legal documents
    const privacyPolicyContent = `This Privacy Policy complies with GDPR Article 9 for health data processing...`;
    const termsContent = `These Terms of Service govern the use of the Doktu telemedicine platform...`;
    const gdprContent = `This GDPR Compliance Statement outlines our commitment to data protection...`;
    const disclaimerContent = `This Medical Disclaimer explains the limitations of telemedicine services...`;

    await db.execute(sql`
      INSERT INTO legal_documents (document_type, version, content, effective_date, is_active)
      VALUES 
        ('privacy_policy', '1.0', ${privacyPolicyContent}, NOW(), true),
        ('terms_of_service', '1.0', ${termsContent}, NOW(), true),
        ('gdpr_compliance', '1.0', ${gdprContent}, NOW(), true),
        ('medical_disclaimer', '1.0', ${disclaimerContent}, NOW(), true)
      ON CONFLICT DO NOTHING
    `);
    console.log("✅ Inserted initial legal documents");

    console.log("\n✅ All GDPR compliance tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating GDPR tables:", error);
    process.exit(1);
  }
}

createGDPRTables();