-- Create the missing notifications table
-- Based on shared/schema.ts line 786

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) NOT NULL,
  type VARCHAR NOT NULL, -- appointment_reminder, payment_confirmation, etc.
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Grant access
GRANT ALL ON notifications TO postgres;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;
