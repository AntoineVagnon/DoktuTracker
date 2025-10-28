-- Migration: Add Doctor Registration Feature Fields
-- Date: 2025-01-14
-- Description: Add fields required for doctor registration workflow with admin approval and profile completion tracking

-- Step 1: Add new columns to doctors table
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS license_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS license_expiration_date DATE,
ADD COLUMN IF NOT EXISTS countries TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS iban VARCHAR(34),
ADD COLUMN IF NOT EXISTS iban_verification_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_type VARCHAR(20), -- 'soft' or 'hard'
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);
CREATE INDEX IF NOT EXISTS idx_doctors_license_number ON doctors(license_number);
CREATE INDEX IF NOT EXISTS idx_doctors_license_expiration ON doctors(license_expiration_date);
CREATE INDEX IF NOT EXISTS idx_doctors_countries ON doctors USING GIN(countries);

-- Step 3: Add CHECK constraints for data integrity
ALTER TABLE doctors
ADD CONSTRAINT chk_doctor_status CHECK (status IN (
  'pending_review',
  'approved',
  'profile_incomplete',
  'active',
  'suspended',
  'rejected_soft',
  'rejected_hard'
));

ALTER TABLE doctors
ADD CONSTRAINT chk_iban_format CHECK (
  iban IS NULL OR
  length(iban) >= 15 AND length(iban) <= 34
);

ALTER TABLE doctors
ADD CONSTRAINT chk_profile_completion CHECK (
  profile_completion_percentage >= 0 AND
  profile_completion_percentage <= 100
);

-- Step 4: Create doctor_application_audit table for tracking all status changes
CREATE TABLE IF NOT EXISTS doctor_application_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  reason TEXT,
  notes TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_audit_doctor_id ON doctor_application_audit(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_audit_created_at ON doctor_application_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_doctor_audit_status ON doctor_application_audit(new_status);

-- Step 5: Create email_blacklist table for hard rejections
CREATE TABLE IF NOT EXISTS email_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of email
  reason TEXT NOT NULL,
  blacklisted_by INTEGER REFERENCES users(id),
  blacklisted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- NULL = permanent
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_email_blacklist_hash ON email_blacklist(email_hash);
CREATE INDEX IF NOT EXISTS idx_email_blacklist_expires ON email_blacklist(expires_at) WHERE expires_at IS NOT NULL;

-- Step 6: Migrate existing approved doctors to new status system
UPDATE doctors
SET status = CASE
  WHEN users.approved = true THEN 'active'
  ELSE 'pending_review'
END,
approved_at = CASE
  WHEN users.approved = true THEN NOW()
  ELSE NULL
END,
activated_at = CASE
  WHEN users.approved = true THEN NOW()
  ELSE NULL
END
FROM users
WHERE doctors.user_id = users.id;

-- Step 7: Add comment documentation
COMMENT ON COLUMN doctors.status IS 'Current application/account status: pending_review, approved, profile_incomplete, active, suspended, rejected_soft, rejected_hard';
COMMENT ON COLUMN doctors.license_number IS 'Medical license number (country-specific format)';
COMMENT ON COLUMN doctors.license_expiration_date IS 'Date when medical license expires - monitored for compliance';
COMMENT ON COLUMN doctors.countries IS 'Array of country codes where doctor is licensed to practice (EU + Balkan)';
COMMENT ON COLUMN doctors.iban IS 'International Bank Account Number for receiving consultation payments';
COMMENT ON COLUMN doctors.iban_verification_status IS 'IBAN verification status: pending, verified, failed';
COMMENT ON COLUMN doctors.profile_completion_percentage IS 'Calculated percentage of required profile fields completed (0-100)';
COMMENT ON COLUMN doctors.rejection_reason IS 'Admin-provided reason for rejection';
COMMENT ON COLUMN doctors.rejection_type IS 'Type of rejection: soft (can reapply after 30 days) or hard (permanent ban)';

COMMENT ON TABLE doctor_application_audit IS 'Audit trail for all doctor application status changes - retained for 7 years per GDPR';
COMMENT ON TABLE email_blacklist IS 'Blacklisted emails from hard-rejected doctor applications - prevents reregistration';

-- Step 8: Grant permissions (adjust based on your database roles)
-- GRANT SELECT, INSERT, UPDATE ON doctor_application_audit TO app_user;
-- GRANT SELECT, INSERT ON email_blacklist TO app_user;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added status-based workflow fields to doctors table';
  RAISE NOTICE 'Created doctor_application_audit table for audit trail';
  RAISE NOTICE 'Created email_blacklist table for hard rejections';
  RAISE NOTICE 'Migrated % existing doctors to new status system', (SELECT COUNT(*) FROM doctors);
END $$;
