-- Fix doctors table sequence synchronization issue
-- This resets the sequence to the maximum ID + 1

-- Reset the doctors_id_seq sequence to match the highest existing ID
SELECT setval('doctors_id_seq', COALESCE((SELECT MAX(id) FROM doctors), 0) + 1, false);

-- Verify the sequence is now correct
SELECT
  'doctors_id_seq' as sequence_name,
  last_value as current_value,
  (SELECT MAX(id) FROM doctors) as max_table_id,
  (SELECT COUNT(*) FROM doctors) as total_doctors;
