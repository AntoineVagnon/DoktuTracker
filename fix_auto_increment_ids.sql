-- Fix auto-increment primary keys for Doktu database tables
-- Run this in your Supabase SQL editor to resolve the ID constraint violations

-- 1. Fix users table ID to use auto-increment
-- First, find the highest ID currently in use
SELECT MAX(id) as max_id FROM users;

-- Create a sequence for users table (adjust the starting value based on MAX(id) above)
CREATE SEQUENCE IF NOT EXISTS users_id_seq;
ALTER SEQUENCE users_id_seq OWNED BY users.id;

-- Set the sequence to start from the next available ID (replace 100 with MAX(id) + 1)
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1);

-- Alter the users table to use the sequence for default values
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');

-- 2. Fix doctors table ID to use auto-increment
SELECT MAX(id) as max_id FROM doctors;

CREATE SEQUENCE IF NOT EXISTS doctors_id_seq;
ALTER SEQUENCE doctors_id_seq OWNED BY doctors.id;
SELECT setval('doctors_id_seq', COALESCE((SELECT MAX(id) FROM doctors), 0) + 1);
ALTER TABLE doctors ALTER COLUMN id SET DEFAULT nextval('doctors_id_seq');

-- 3. Fix appointments table ID to use auto-increment
SELECT MAX(id) as max_id FROM appointments;

CREATE SEQUENCE IF NOT EXISTS appointments_id_seq;
ALTER SEQUENCE appointments_id_seq OWNED BY appointments.id;
SELECT setval('appointments_id_seq', COALESCE((SELECT MAX(id) FROM appointments), 0) + 1);
ALTER TABLE appointments ALTER COLUMN id SET DEFAULT nextval('appointments_id_seq');

-- Verify the changes
SELECT 
  table_name, 
  column_name, 
  column_default,
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'doctors', 'appointments') 
  AND column_name = 'id'
ORDER BY table_name;