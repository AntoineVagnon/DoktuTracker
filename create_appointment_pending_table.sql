-- Create appointment_pending table for slot holding during booking flow
CREATE TABLE IF NOT EXISTS appointment_pending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_slot_id UUID NOT NULL REFERENCES doctor_time_slots(id) ON DELETE CASCADE,
    session_id VARCHAR NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_appointment_pending_session_id ON appointment_pending(session_id);
CREATE INDEX IF NOT EXISTS idx_appointment_pending_expires_at ON appointment_pending(expires_at);
CREATE INDEX IF NOT EXISTS idx_appointment_pending_time_slot_id ON appointment_pending(time_slot_id);

-- Clean up any expired records
DELETE FROM appointment_pending WHERE expires_at < NOW();