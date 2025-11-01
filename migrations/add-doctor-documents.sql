-- Migration: Replace license number/expiration with German medical document uploads
-- Date: 2025-11-01
-- Description: Add doctor_documents table for Approbationsurkunde, Facharzturkunde, and Zusatzbezeichnung

-- Create doctor_documents table for German medical credentials
CREATE TABLE IF NOT EXISTS doctor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,

  -- Document type: approbation, facharzturkunde, zusatzbezeichnung
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('approbation', 'facharzturkunde', 'zusatzbezeichnung')),

  -- File information
  file_name VARCHAR(255) NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_url TEXT NOT NULL,

  -- Document metadata
  upload_date TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Verification status
  verification_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
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
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure uniqueness: one document of each type per doctor (can be replaced)
  UNIQUE(doctor_id, document_type)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_doctor_documents_doctor_id ON doctor_documents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_documents_type ON doctor_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_doctor_documents_status ON doctor_documents(verification_status);

-- Add uploaded_date column to doctors table for tracking when documents were submitted
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS documents_uploaded_at TIMESTAMP;

-- Note: We're keeping licenseNumber and licenseExpirationDate columns for now
-- to avoid breaking existing data. They will be deprecated and hidden in the UI.
-- In a future migration, after data migration, these can be dropped:
-- ALTER TABLE doctors DROP COLUMN IF EXISTS license_number;
-- ALTER TABLE doctors DROP COLUMN IF EXISTS license_expiration_date;

-- Add comment to doctors table
COMMENT ON TABLE doctor_documents IS 'Stores German medical credential documents for doctors (Approbationsurkunde, Facharzturkunde, Zusatzbezeichnung)';
COMMENT ON COLUMN doctor_documents.document_type IS 'Type of document: approbation (mandatory), facharzturkunde (mandatory), zusatzbezeichnung (optional)';
COMMENT ON COLUMN doctor_documents.verification_status IS 'Admin verification status of the uploaded document';
