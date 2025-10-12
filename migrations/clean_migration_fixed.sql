-- Add medical_approach column to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS medical_approach TEXT;

-- Add comment for documentation
COMMENT ON COLUMN doctors.medical_approach IS 'Doctor''s medical philosophy and approach to patient care';

-- Create audit_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id),
  action VARCHAR NOT NULL,
  resource_type VARCHAR,
  resource_id VARCHAR,
  details JSONB,
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);

-- Add comment
COMMENT ON TABLE audit_events IS 'Audit log for admin actions and system events';
