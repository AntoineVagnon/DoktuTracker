-- Update existing users to populate firstName and lastName from email addresses
-- This script will parse email addresses like "james.rodriguez@doktu.com" to extract names

UPDATE users 
SET 
  first_name = CASE 
    WHEN first_name IS NULL AND email LIKE '%.%@%' THEN
      INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 1))
    ELSE first_name
  END,
  last_name = CASE 
    WHEN last_name IS NULL AND email LIKE '%.%@%' THEN
      INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 2))
    ELSE last_name
  END,
  title = CASE 
    WHEN title IS NULL AND role = 'doctor' THEN 'Dr.'
    ELSE title
  END,
  updated_at = NOW()
WHERE 
  (first_name IS NULL OR last_name IS NULL)
  AND email LIKE '%.%@%';

-- Show the results
SELECT id, email, first_name, last_name, title, role 
FROM users 
WHERE email LIKE '%.%@%'
ORDER BY id;