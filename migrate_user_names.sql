-- Migration to add structured name fields to users table
-- This implements the user story for structured names

-- Add new columns for structured names
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR;

-- Add cancel_reason column to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  patient_id VARCHAR NOT NULL REFERENCES users(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update existing users to populate structured names from username/email
-- Parse doctor names from email (e.g., "sarah.miller@doktu.com" -> "Sarah Miller")
UPDATE users 
SET 
  first_name = CASE 
    WHEN role = 'doctor' AND email LIKE '%@doktu.com' THEN 
      INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 1))
    ELSE NULL
  END,
  last_name = CASE 
    WHEN role = 'doctor' AND email LIKE '%@doktu.com' THEN 
      INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 2))
    ELSE NULL
  END,
  title = CASE 
    WHEN role = 'doctor' THEN 'Dr.'
    ELSE NULL
  END
WHERE first_name IS NULL AND last_name IS NULL;

-- Update existing users to populate names from username for non-doctor users
UPDATE users 
SET 
  first_name = CASE 
    WHEN role != 'doctor' AND username LIKE '%.%' THEN 
      INITCAP(SPLIT_PART(username, '.', 1))
    WHEN role != 'doctor' AND username NOT LIKE '%.%' THEN 
      INITCAP(username)
    ELSE first_name
  END,
  last_name = CASE 
    WHEN role != 'doctor' AND username LIKE '%.%' THEN 
      INITCAP(SPLIT_PART(username, '.', 2))
    ELSE last_name
  END
WHERE (first_name IS NULL OR last_name IS NULL) AND role != 'doctor';