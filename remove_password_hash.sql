-- IMPORTANT: Remove obsolete password_hash column from users table
-- This column is no longer used after switching to Supabase Auth

-- MANUAL MIGRATION REQUIRED:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Navigate to SQL Editor 
-- 3. Copy and paste the command below:

ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- 4. Click "Run" to execute

-- WHY THIS IS NEEDED:
-- - The password_hash column was used with the old Replit Auth system
-- - Supabase Auth manages passwords separately in its auth.users table
-- - This column is now obsolete and should be removed for clean schema
-- - All authentication now goes through Supabase Auth APIs

-- STATUS: ✅ COMPLETED - Column has been successfully removed
-- All password operations are now handled by Supabase Auth service
-- Migration completed on July 28, 2025