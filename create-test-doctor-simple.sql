-- Create Test Doctor Account for Testing
-- Run this in Supabase SQL Editor
-- Email: test.doctor@doktu.co
-- Password: TestDoctor123!

-- Step 1: First create the user in Supabase Auth UI:
-- Go to Authentication > Users > Add User
-- Email: test.doctor@doktu.co
-- Password: TestDoctor123!
-- Confirm email automatically: YES

-- Step 2: After creating auth user, get the UUID and run this:

-- Insert into users table (replace USER_UUID with actual UUID from auth.users)
INSERT INTO users (email, "firstName", "lastName", role, "phoneNumber", "createdAt")
VALUES (
  'test.doctor@doktu.co',
  'Test',
  'Doctor',
  'doctor',
  '+33612345678',
  NOW()
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Step 3: Get the user UUID from Supabase Auth and insert doctor profile
-- Replace USER_UUID with the actual UUID from auth.users table
INSERT INTO doctors (
  "userId",
  "firstName",
  "lastName",
  email,
  specialization,
  title,
  bio,
  "licenseNumber",
  "yearsOfExperience",
  "consultationFee",
  languages,
  rating,
  "reviewCount",
  verified,
  "acceptingNewPatients",
  "createdAt"
)
VALUES (
  'USER_UUID_HERE', -- Replace with actual UUID from auth.users
  'Test',
  'Doctor',
  'test.doctor@doktu.co',
  'General Medicine',
  'Dr.',
  'Test doctor account for automated testing and QA purposes.',
  'TEST-' || extract(epoch from now())::text,
  10,
  35.00,
  ARRAY['English', 'French'],
  5.0,
  0,
  true,
  true,
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;

-- Verify the doctor was created
SELECT d.id, d."firstName", d."lastName", d.email, d.specialization, u.id as auth_user_id
FROM doctors d
JOIN auth.users u ON u.id = d."userId"::uuid
WHERE d.email = 'test.doctor@doktu.co';
