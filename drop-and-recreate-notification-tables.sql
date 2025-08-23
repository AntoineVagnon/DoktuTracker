-- Drop existing notification tables and recreate with appointment_id columns

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS notification_sent_log CASCADE;
DROP TABLE IF EXISTS notification_history CASCADE;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS notification_audit_log CASCADE;
DROP TABLE IF EXISTS in_app_notifications CASCADE;

-- 1. Create in_app_notifications table
CREATE TABLE in_app_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    trigger_code VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    style VARCHAR(50) DEFAULT 'info',
    priority INTEGER DEFAULT 3,
    cta_text VARCHAR(255),
    cta_url VARCHAR(500),
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- 2. Create notification_audit_log table
CREATE TABLE notification_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    email_notification_id VARCHAR(255),
    sms_notification_id VARCHAR(255),
    trigger_code VARCHAR(10),
    notification_type VARCHAR(50),
    event_type VARCHAR(50),
    channel VARCHAR(50),
    status VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create notification_queue table
CREATE TABLE notification_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    trigger_code VARCHAR(10) NOT NULL,
    channels TEXT[] DEFAULT ARRAY[]::TEXT[],
    priority INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    error_message TEXT
);

-- 4. Create notification_history table
CREATE TABLE notification_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    trigger_code VARCHAR(10) NOT NULL,
    channels TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50),
    sent_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create notification_sent_log table
CREATE TABLE notification_sent_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_in_app_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX idx_in_app_notifications_read ON in_app_notifications(read);
CREATE INDEX idx_in_app_notifications_created_at ON in_app_notifications(created_at DESC);

CREATE INDEX idx_notification_audit_log_user_id ON notification_audit_log(user_id);
CREATE INDEX idx_notification_audit_log_trigger_code ON notification_audit_log(trigger_code);
CREATE INDEX idx_notification_audit_log_created_at ON notification_audit_log(created_at DESC);

CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);
CREATE INDEX idx_notification_queue_user_id ON notification_queue(user_id);

CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_trigger_code ON notification_history(trigger_code);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at DESC);

CREATE INDEX idx_notification_sent_log_user_id ON notification_sent_log(user_id);
CREATE INDEX idx_notification_sent_log_notification_type ON notification_sent_log(notification_type);
CREATE INDEX idx_notification_sent_log_sent_at ON notification_sent_log(sent_at DESC);