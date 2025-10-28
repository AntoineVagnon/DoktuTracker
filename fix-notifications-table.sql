-- Drop the incorrectly created notifications table
DROP TABLE IF EXISTS notifications CASCADE;

-- Create the complete notifications table matching the app's expectations
-- Based on email_notifications structure and app usage
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) NOT NULL,
  appointment_id INTEGER REFERENCES appointments(id),
  trigger_code VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  priority INTEGER DEFAULT 1 NOT NULL,
  is_read BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_trigger_code ON notifications(trigger_code);

-- Grant access
GRANT ALL ON notifications TO postgres;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;
