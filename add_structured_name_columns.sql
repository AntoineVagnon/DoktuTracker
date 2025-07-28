-- Add structured name columns to users table
-- This enables the normalized name storage system

-- Add new columns for structured names
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR;

-- Populate structured names from existing data
-- For doctors: parse from email (e.g., sarah.miller@doktu.com -> Dr. Sarah Miller)
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

-- For other users: parse from username
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

-- Verify the results
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
WHERE role = 'doctor'
LIMIT 5;