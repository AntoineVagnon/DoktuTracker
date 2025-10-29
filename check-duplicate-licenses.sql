-- Check for duplicate or problematic license numbers in doctors table
SELECT 
  d.id,
  d.license_number as "licenseNumber",
  d.status,
  u.email,
  u.first_name as "firstName",
  u.last_name as "lastName",
  d.created_at as "createdAt"
FROM doctors d
JOIN users u ON d.user_id = u.id
ORDER BY d.created_at DESC
LIMIT 20;
