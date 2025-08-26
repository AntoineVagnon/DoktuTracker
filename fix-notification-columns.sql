-- Add missing columns to notification_templates table
ALTER TABLE notification_templates 
ADD COLUMN IF NOT EXISTS auto_dismiss_seconds INTEGER DEFAULT 10;

-- Add missing columns to notification_audit_log table
ALTER TABLE notification_audit_log 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Show the updated table structures
\d notification_templates;
\d notification_audit_log;