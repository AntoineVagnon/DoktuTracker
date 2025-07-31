-- URGENT: Temporary fix for registration issues
-- Run this immediately in your Supabase SQL editor to fix the user registration

-- 1. First, check what's the highest user ID
SELECT MAX(id) as highest_id FROM users;

-- 2. Create or update the sequence to start from the next available number
-- Replace the number 50 with (highest_id + 10) from the result above
DROP SEQUENCE IF EXISTS users_id_seq CASCADE;
CREATE SEQUENCE users_id_seq START WITH 50;
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');

-- 3. Fix any orphaned Supabase auth users that don't have corresponding database records
-- This query will show if there are auth users without database records
-- (You can't run this directly, but it explains the issue)
-- SELECT auth.users.email FROM auth.users 
-- LEFT JOIN public.users ON auth.users.email = public.users.email 
-- WHERE public.users.email IS NULL;

-- 4. Verify the fix worked
SELECT column_name, column_default, data_type
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'id';