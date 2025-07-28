-- Remove obsolete password_hash column from users table
-- This aligns with Supabase Auth architecture where passwords are managed by Supabase

-- Migration to run in Supabase SQL Editor:
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Alternative approaches if direct SQL access is available:
-- 1. Via Supabase Dashboard > SQL Editor: paste and run the ALTER statement above
-- 2. The column exists but is no longer used by the application
-- 3. All password management is now handled by Supabase Auth, not the users table