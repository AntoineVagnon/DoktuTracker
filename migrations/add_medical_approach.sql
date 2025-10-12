-- Add medical_approach column to doctors table
-- This migration adds the missing medical_approach field

ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS medical_approach TEXT;

-- Add comment for documentation
COMMENT ON COLUMN doctors.medical_approach IS 'Doctor''s medical philosophy and approach to patient care';
