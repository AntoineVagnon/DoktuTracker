-- Add missing columns to notification_preferences table for Universal Notification System

-- Check if columns exist before adding them
DO $$ 
BEGIN
    -- Add category-specific preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'security_enabled') THEN
        ALTER TABLE notification_preferences ADD COLUMN security_enabled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'transactional_enabled') THEN
        ALTER TABLE notification_preferences ADD COLUMN transactional_enabled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'appointment_reminders_enabled') THEN
        ALTER TABLE notification_preferences ADD COLUMN appointment_reminders_enabled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'marketing_emails_enabled') THEN
        ALTER TABLE notification_preferences ADD COLUMN marketing_emails_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'life_cycle_enabled') THEN
        ALTER TABLE notification_preferences ADD COLUMN life_cycle_enabled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'document_notifications_enabled') THEN
        ALTER TABLE notification_preferences ADD COLUMN document_notifications_enabled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'membership_notifications_enabled') THEN
        ALTER TABLE notification_preferences ADD COLUMN membership_notifications_enabled BOOLEAN DEFAULT true;
    END IF;
    
    -- Add frequency cap preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'marketing_emails_per_week') THEN
        ALTER TABLE notification_preferences ADD COLUMN marketing_emails_per_week INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'life_cycle_nudges_per_week') THEN
        ALTER TABLE notification_preferences ADD COLUMN life_cycle_nudges_per_week INTEGER DEFAULT 3;
    END IF;
    
    -- Add quiet hours preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'quiet_hours_enabled') THEN
        ALTER TABLE notification_preferences ADD COLUMN quiet_hours_enabled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'quiet_hours_start') THEN
        ALTER TABLE notification_preferences ADD COLUMN quiet_hours_start TIME DEFAULT '22:00:00';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'quiet_hours_end') THEN
        ALTER TABLE notification_preferences ADD COLUMN quiet_hours_end TIME DEFAULT '08:00:00';
    END IF;
    
    -- Add timezone and locale
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'timezone') THEN
        ALTER TABLE notification_preferences ADD COLUMN timezone VARCHAR(255) DEFAULT 'Europe/Paris';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'locale') THEN
        ALTER TABLE notification_preferences ADD COLUMN locale VARCHAR(10) DEFAULT 'en';
    END IF;
    
    -- Add metadata and timestamps if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'metadata') THEN
        ALTER TABLE notification_preferences ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Ensure the columns have proper defaults for existing rows
UPDATE notification_preferences 
SET 
    security_enabled = COALESCE(security_enabled, true),
    transactional_enabled = COALESCE(transactional_enabled, true),
    appointment_reminders_enabled = COALESCE(appointment_reminders_enabled, true),
    marketing_emails_enabled = COALESCE(marketing_emails_enabled, false),
    life_cycle_enabled = COALESCE(life_cycle_enabled, true),
    document_notifications_enabled = COALESCE(document_notifications_enabled, true),
    membership_notifications_enabled = COALESCE(membership_notifications_enabled, true),
    marketing_emails_per_week = COALESCE(marketing_emails_per_week, 1),
    life_cycle_nudges_per_week = COALESCE(life_cycle_nudges_per_week, 3),
    quiet_hours_enabled = COALESCE(quiet_hours_enabled, true),
    quiet_hours_start = COALESCE(quiet_hours_start, '22:00:00'),
    quiet_hours_end = COALESCE(quiet_hours_end, '08:00:00'),
    timezone = COALESCE(timezone, 'Europe/Paris'),
    locale = COALESCE(locale, 'en'),
    metadata = COALESCE(metadata, '{}')
WHERE transactional_enabled IS NULL 
   OR appointment_reminders_enabled IS NULL
   OR marketing_emails_enabled IS NULL
   OR life_cycle_enabled IS NULL
   OR document_notifications_enabled IS NULL
   OR membership_notifications_enabled IS NULL
   OR marketing_emails_per_week IS NULL
   OR life_cycle_nudges_per_week IS NULL
   OR quiet_hours_enabled IS NULL
   OR quiet_hours_start IS NULL
   OR quiet_hours_end IS NULL
   OR timezone IS NULL
   OR locale IS NULL
   OR metadata IS NULL;