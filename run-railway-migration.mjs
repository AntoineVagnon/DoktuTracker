// Railway Production Database Migration
// This script creates the doctor_documents table in Railway production database

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import pkg from 'pg';
const { Client } = pkg;

// Railway production database URL
const DATABASE_URL = "postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require";

const client = new Client({
  connectionString: DATABASE_URL
});

const createTableSQL = `
-- Create doctor_documents table for German medical credential documents
CREATE TABLE IF NOT EXISTS doctor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,

  -- Document type: approbation (mandatory), facharzturkunde (mandatory), zusatzbezeichnung (optional)
  document_type VARCHAR(50) NOT NULL,

  -- File information
  file_name VARCHAR(255) NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_url TEXT NOT NULL,

  -- Document metadata
  upload_date TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Verification status: pending, verified, rejected, expired
  verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  rejection_reason TEXT,

  -- Document details (optional, extracted from document)
  issue_date DATE,
  expiry_date DATE,
  issuing_authority VARCHAR(255),
  document_number VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctor_documents_doctor_id ON doctor_documents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_documents_type ON doctor_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_doctor_documents_status ON doctor_documents(verification_status);

-- Verify doctors table has nullable license fields (backward compatibility)
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'doctors'
AND column_name IN ('license_number', 'license_expiration_date');
`;

async function runMigration() {
  try {
    console.log('🚀 Railway Production Database Migration\n');
    console.log('🔄 Connecting to Railway database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🔄 Creating doctor_documents table...');
    await client.query(createTableSQL);
    console.log('✅ Migration completed successfully!\n');

    // Verify table was created
    const tableCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_name = 'doctor_documents';
    `);

    if (tableCheck.rows[0].count === '1') {
      console.log('✅ Table verification: doctor_documents exists\n');

      // Get column count
      const columnCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = 'doctor_documents';
      `);

      console.log(`✅ Table has ${columnCheck.rows[0].count} columns\n`);

      // Check indexes
      const indexCheck = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'doctor_documents';
      `);

      console.log('✅ Indexes created:');
      indexCheck.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });

      console.log('\n🎉 Railway production database is ready!');
      console.log('\n📋 Next steps:');
      console.log('   1. Verify Railway deployment is running latest code');
      console.log('   2. Test POST /api/doctor-registration/signup (no license fields)');
      console.log('   3. Test POST /api/doctor-documents/upload');

    } else {
      console.log('❌ Table verification failed: doctor_documents does not exist');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
