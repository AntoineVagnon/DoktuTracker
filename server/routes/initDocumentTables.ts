import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

// Temporary endpoint to create document library tables
router.post("/init-document-tables", async (req, res) => {
  try {
    console.log('Creating document library tables...');
    
    // Create document uploads table
    await db.execute(sql`
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
    `);
    
    // Create appointment documents junction table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS appointment_documents (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          appointment_id integer NOT NULL REFERENCES appointments(id),
          document_id uuid NOT NULL REFERENCES document_uploads(id),
          attached_at timestamp DEFAULT now()
      )
    `);
    
    // Create index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_appointment_document_unique 
      ON appointment_documents(appointment_id, document_id)
    `);
    
    console.log('✅ Document library tables created successfully');
    
    // Insert a sample document for testing
    await db.execute(sql`
      INSERT INTO document_uploads (uploaded_by, file_name, file_size, file_type, upload_url, document_type)
      VALUES (49, 'sample_report.pdf', 1024, 'application/pdf', '/uploads/sample_report.pdf', 'medical_report')
      ON CONFLICT DO NOTHING
    `);
    
    res.json({ 
      success: true, 
      message: "Document library tables created successfully" 
    });
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;