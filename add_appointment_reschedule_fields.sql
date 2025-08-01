-- Add fields for appointment rescheduling and cancellation feature
-- This migration adds necessary fields to appointments and appointment_changes tables

-- Add new fields to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES doctor_time_slots(id),
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 35.00;

-- Create appointment_changes table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointment_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL, -- reschedule, cancel
  actor_id INTEGER REFERENCES users(id),
  actor_role VARCHAR(255),
  reason TEXT,
  before JSONB,
  after JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on appointment_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointment_changes_appointment_id ON appointment_changes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_changes_created_at ON appointment_changes(created_at);

-- Add comments for documentation
COMMENT ON COLUMN appointments.cancel_reason IS 'Reason provided when appointment is cancelled';
COMMENT ON COLUMN appointments.cancelled_by IS 'Who cancelled the appointment (patient/doctor/admin)';
COMMENT ON COLUMN appointments.reschedule_count IS 'Number of times this appointment has been rescheduled';
COMMENT ON COLUMN appointments.slot_id IS 'Reference to the doctor time slot for this appointment';
COMMENT ON COLUMN appointments.price IS 'Price for this appointment in EUR';

COMMENT ON TABLE appointment_changes IS 'Audit log for appointment modifications (reschedule/cancel)';
COMMENT ON COLUMN appointment_changes.action IS 'Type of change: reschedule or cancel';
COMMENT ON COLUMN appointment_changes.actor_id IS 'User who made the change';
COMMENT ON COLUMN appointment_changes.actor_role IS 'Role of the user who made the change';
COMMENT ON COLUMN appointment_changes.before IS 'State before the change';
COMMENT ON COLUMN appointment_changes.after IS 'State after the change';