-- Check the actual structure of doctor_time_slots table
\d doctor_time_slots;

-- Check a sample doctor record to understand the ID format
SELECT id, "user_id" FROM doctors LIMIT 3;

-- Check if there are any existing time slots
SELECT * FROM doctor_time_slots LIMIT 3;