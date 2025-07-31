-- Fix timezone issues in existing appointments
-- This corrects appointments that were stored with incorrect UTC conversion
-- Run this in your Supabase SQL editor to fix existing appointment times

-- First, let's see the current appointments and their times
SELECT 
  id, 
  patient_id,
  doctor_id,
  appointment_date,
  appointment_date - INTERVAL '2 hours' as corrected_local_time,
  status,
  created_at
FROM appointments 
WHERE status = 'paid'
ORDER BY appointment_date;

-- Update existing appointments to correct the timezone offset
-- This subtracts 2 hours from the stored UTC time to get the intended local time
UPDATE appointments 
SET 
  appointment_date = appointment_date - INTERVAL '2 hours',
  updated_at = NOW()
WHERE status = 'paid' 
  AND appointment_date > NOW() - INTERVAL '1 day'; -- Only fix recent appointments

-- Verify the fix
SELECT 
  id, 
  patient_id,
  doctor_id,
  appointment_date as corrected_appointment_date,
  status,
  updated_at
FROM appointments 
WHERE status = 'paid'
ORDER BY appointment_date;