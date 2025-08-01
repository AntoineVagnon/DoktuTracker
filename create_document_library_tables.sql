-- Create document library tables for appointment document sharing feature

-- Create document uploads table (patient's personal library)
CREATE TABLE IF NOT EXISTS document_uploads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by integer NOT NULL REFERENCES users(id),
    file_name varchar NOT NULL,
    file_size integer NOT NULL,
    file_type varchar NOT NULL,
    upload_url text NOT NULL,
    document_type varchar,
    uploaded_at timestamp DEFAULT now()
);

-- Create appointment documents junction table (for attaching documents to appointments)
CREATE TABLE IF NOT EXISTS appointment_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id integer NOT NULL REFERENCES appointments(id),
    document_id uuid NOT NULL REFERENCES document_uploads(id),
    attached_at timestamp DEFAULT now()
);

-- Create unique index for appointment-document pairs
CREATE INDEX IF NOT EXISTS idx_appointment_document_unique 
ON appointment_documents(appointment_id, document_id);

-- Add some sample data for testing (optional)
-- INSERT INTO document_uploads (uploaded_by, file_name, file_size, file_type, upload_url, document_type)
-- VALUES (49, 'test_document.pdf', 1024, 'application/pdf', '/uploads/test_document.pdf', 'medical_report');