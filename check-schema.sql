-- Check doctor_documents table exists
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'doctor_documents'
ORDER BY ordinal_position;

-- Check indexes on doctor_documents
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'doctor_documents';

-- Check if doctors table has license fields (should be nullable)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'doctors'
AND column_name IN ('license_number', 'license_expiration_date', 'rpps_number');
