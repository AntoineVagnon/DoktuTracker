-- Fix doctors table sequence synchronization issue
-- This resets the sequence to the maximum ID + 1

-- Step 1: Reset the doctors_id_seq sequence to match the highest existing ID
SELECT setval('doctors_id_seq', COALESCE((SELECT MAX(id) FROM doctors), 0) + 1, false);

-- Step 2: Verify the sequence is now correct
SELECT
  'doctors_id_seq' as sequence_name,
  currval('doctors_id_seq') as current_value,
  (SELECT MAX(id) FROM doctors) as max_table_id,
  (SELECT COUNT(*) FROM doctors) as total_doctors;
