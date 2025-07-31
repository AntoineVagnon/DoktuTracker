-- First, let's see what users have missing names
SELECT id, email, first_name, last_name, title, role 
FROM users 
WHERE first_name IS NULL OR last_name IS NULL
ORDER BY id;

-- Update users with missing names from email addresses
-- This handles various email formats: firstname.lastname@domain.com, firstname@domain.com, etc.
UPDATE users 
SET 
  first_name = CASE 
    WHEN first_name IS NULL THEN
      CASE 
        -- If email has format firstname.lastname@domain
        WHEN email LIKE '%.%@%' THEN
          INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 1))
        -- If email has format firstname@domain (no dot)
        ELSE
          INITCAP(SPLIT_PART(email, '@', 1))
      END
    ELSE first_name
  END,
  last_name = CASE 
    WHEN last_name IS NULL THEN
      CASE 
        -- If email has format firstname.lastname@domain
        WHEN email LIKE '%.%@%' THEN
          INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 2))
        -- If no dot in email, leave last_name as NULL or set to empty
        ELSE NULL
      END
    ELSE last_name
  END,
  title = CASE 
    WHEN title IS NULL AND role = 'doctor' THEN 'Dr.'
    ELSE title
  END,
  updated_at = NOW()
WHERE 
  first_name IS NULL OR last_name IS NULL;

-- Show the updated results
SELECT id, email, first_name, last_name, title, role 
FROM users 
ORDER BY id;