// Manual script to create document library tables
import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function createDocumentTables() {
  try {
    console.log('Creating document library tables...');
    
    // Create document uploads table (patient's personal library)
    await sql`
      CREATE TABLE IF NOT EXISTS document_uploads (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          uploaded_by integer NOT NULL REFERENCES users(id),
          file_name varchar NOT NULL,
          file_size integer NOT NULL,
          file_type varchar NOT NULL,
          upload_url text NOT NULL,
          document_type varchar,
          uploaded_at timestamp DEFAULT now()
      )
    `;
    
    // Create appointment documents junction table
    await sql`
      CREATE TABLE IF NOT EXISTS appointment_documents (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          appointment_id integer NOT NULL REFERENCES appointments(id),
          document_id uuid NOT NULL REFERENCES document_uploads(id),
          attached_at timestamp DEFAULT now()
      )
    `;
    
    // Create unique index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_appointment_document_unique 
      ON appointment_documents(appointment_id, document_id)
    `;
    
    console.log('✅ Document library tables created successfully!');
    
    // Test the tables by inserting a sample document for user 49
    await sql`
      INSERT INTO document_uploads (uploaded_by, file_name, file_size, file_type, upload_url, document_type)
      VALUES (49, 'sample_medical_report.pdf', 2048, 'application/pdf', '/uploads/sample_medical_report.pdf', 'medical_report')
      ON CONFLICT DO NOTHING
    `;
    
    console.log('✅ Sample document inserted for testing');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createDocumentTables();