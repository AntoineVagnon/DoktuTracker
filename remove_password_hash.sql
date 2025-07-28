-- Remove obsolete password_hash column from users table
-- This aligns with Supabase Auth architecture where passwords are managed by Supabase
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;