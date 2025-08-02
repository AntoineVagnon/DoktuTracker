-- Create test appointments for inline actions
-- Patient: patient@test40.com (ID 49)
-- Doctor: Dr. James Rodriguez (ID 9)

-- Insert 3 test appointments scheduled 1, 2, and 3 hours from now
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
    49, 
    9, 
    NOW() + INTERVAL '1 hour', 
    'paid', 
    'in-person', 
    75, 
    CONCAT('test_payment_', EXTRACT(EPOCH FROM NOW())::text, '_1'),
    CONCAT('test_session_', EXTRACT(EPOCH FROM NOW())::text, '_1'),
    'Test appointment 1 for inline actions demo',
    NOW(),
    NOW()
  ),
  (
    49, 
    9, 
    NOW() + INTERVAL '2 hours', 
    'paid', 
    'video', 
    75, 
    CONCAT('test_payment_', EXTRACT(EPOCH FROM NOW())::text, '_2'),
    CONCAT('test_session_', EXTRACT(EPOCH FROM NOW())::text, '_2'),
    'Test appointment 2 (video) for inline actions demo',
    NOW(),
    NOW()
  ),
  (
    49, 
    9, 
    NOW() + INTERVAL '3 hours', 
    'paid', 
    'in-person', 
    75, 
    CONCAT('test_payment_', EXTRACT(EPOCH FROM NOW())::text, '_3'),
    CONCAT('test_session_', EXTRACT(EPOCH FROM NOW())::text, '_3'),
    'Test appointment 3 for inline actions demo',
    NOW(),
    NOW()
  )
RETURNING *;

-- Update the video appointment with Zoom details
UPDATE appointments 
SET 
  zoom_meeting_id = CONCAT('test-meeting-', EXTRACT(EPOCH FROM NOW())::text),
  zoom_join_url = 'https://zoom.us/j/1234567890?pwd=testmeeting',
  zoom_host_url = 'https://zoom.us/s/1234567890?zak=testhost',
  zoom_passcode = 'TEST123'
WHERE 
  patient_id = 49 
  AND doctor_id = 9 
  AND type = 'video'
  AND appointment_date > NOW()
  AND appointment_date < NOW() + INTERVAL '3 hours';