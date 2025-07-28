-- SQL Script to populate structured name fields from existing data
-- This implements the user story for normalizing name storage

-- Step 1: Parse doctor names from their emails and populate structured fields
UPDATE users 
SET 
  title = 'Dr.',
  first_name = CASE 
    WHEN email LIKE '%@doktu.com' THEN 
      INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 1))
    ELSE NULL
  END,
  last_name = CASE 
    WHEN email LIKE '%@doktu.com' THEN 
      INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 2))
    ELSE NULL
  END
WHERE role = 'doctor' 
  AND email LIKE '%@doktu.com'
  AND (first_name IS NULL OR last_name IS NULL);

-- Step 2: Parse patient names from usernames (fallback for non-doctor users)
UPDATE users 
SET 
  first_name = CASE 
    WHEN username LIKE '%.%' THEN 
      INITCAP(SPLIT_PART(username, '.', 1))
    WHEN username NOT LIKE '%.%' THEN 
      INITCAP(username)
    ELSE first_name
  END,
  last_name = CASE 
    WHEN username LIKE '%.%' THEN 
      INITCAP(SPLIT_PART(username, '.', 2))
    ELSE last_name
  END
WHERE role != 'doctor' 
  AND (first_name IS NULL OR last_name IS NULL);

-- Step 3: Set default titles for non-doctors
UPDATE users 
SET title = CASE 
  WHEN role = 'admin' THEN 'Admin'
  WHEN role = 'patient' THEN NULL -- Patients don't need titles by default
  ELSE title
END
WHERE role != 'doctor' AND title IS NULL;

-- Verification: Check the results
SELECT 
  id,
  username,
  email,
  role,
  title,
  first_name,
  last_name,
  CONCAT(COALESCE(title || ' ', ''), COALESCE(first_name, ''), COALESCE(' ' || last_name, '')) AS formatted_name
FROM users 
ORDER BY role, id;