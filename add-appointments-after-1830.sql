-- Add test appointments after 18:30 for patient@test40.com
-- These will be scheduled at 19:00, 20:00, and 21:00 (7 PM, 8 PM, 9 PM)

-- Insert 3 appointments after 18:30
INSERT INTO appointments (
  patient_id, 
  doctor_id, 
  appointment_date, 
  status, 
  type, 
  price, 
  payment_intent_id, 
  session_id, 
  notes,
  created_at,
  updated_at
) VALUES
  (
    49, -- patient@test40.com
    9,  -- Dr. James Rodriguez
    CURRENT_DATE + INTERVAL '19 hours', -- 7:00 PM today
    'paid', 
    'in-person', 
    75, 
    CONCAT('test_payment_after_', EXTRACT(EPOCH FROM NOW())::text, '_1'),
    CONCAT('test_session_after_', EXTRACT(EPOCH FROM NOW())::text, '_1'),
    'Test appointment 1 after 18:30 - for inline actions demo',
    NOW(),
    NOW()
  ),
  (
    49, 
    9, 
    CURRENT_DATE + INTERVAL '20 hours', -- 8:00 PM today
    'paid', 
    'video', 
    75, 
    CONCAT('test_payment_after_', EXTRACT(EPOCH FROM NOW())::text, '_2'),
    CONCAT('test_session_after_', EXTRACT(EPOCH FROM NOW())::text, '_2'),
    'Test appointment 2 after 18:30 (video) - for inline actions demo',
    NOW(),
    NOW()
  ),
  (
    49, 
    9, 
    CURRENT_DATE + INTERVAL '21 hours', -- 9:00 PM today
    'paid', 
    'in-person', 
    75, 
    CONCAT('test_payment_after_', EXTRACT(EPOCH FROM NOW())::text, '_3'),
    CONCAT('test_session_after_', EXTRACT(EPOCH FROM NOW())::text, '_3'),
    'Test appointment 3 after 18:30 - for inline actions demo',
    NOW(),
    NOW()
  )
RETURNING id, appointment_date, type, notes;

-- Add Zoom details to the video appointment (8:00 PM)
UPDATE appointments 
SET 
  zoom_meeting_id = CONCAT('test-meeting-after-', EXTRACT(EPOCH FROM NOW())::text),
  zoom_join_url = 'https://zoom.us/j/9876543210?pwd=testmeetingafter',
  zoom_host_url = 'https://zoom.us/s/9876543210?zak=testhostafter',
  zoom_passcode = 'AFTER123'
WHERE 
  patient_id = 49 
  AND doctor_id = 9 
  AND type = 'video'
  AND DATE(appointment_date) = CURRENT_DATE
  AND EXTRACT(HOUR FROM appointment_date) = 20;