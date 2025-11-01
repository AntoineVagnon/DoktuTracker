// Disable TLS verification for Supabase pooler
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

const createTableSQL = `
CREATE TABLE IF NOT EXISTS doctor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_url TEXT NOT NULL,
  upload_date TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  issue_date DATE,
  expiry_date DATE,
  issuing_authority VARCHAR(255),
  document_number VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_documents_doctor_id ON doctor_documents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_documents_type ON doctor_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_doctor_documents_status ON doctor_documents(verification_status);
`;

async function runMigration() {
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');
    
    console.log('🔄 Creating doctor_documents table...');
    await client.query(createTableSQL);
    
    console.log('✅ Migration completed successfully!');
    
    const result = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'doctor_documents'
      ORDER BY ordinal_position
      LIMIT 10;
    `);
    
    console.log('\n✅ Table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
