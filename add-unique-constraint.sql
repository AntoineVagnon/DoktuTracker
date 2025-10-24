-- Add database constraint to prevent duplicate email notifications
-- This prevents race conditions where multiple notifications are created simultaneously

-- First, clean up any existing duplicates (keep only the oldest one per appointment/trigger)
-- Use ROW_NUMBER() window function instead of MIN(uuid) which doesn't exist
DELETE FROM email_notifications
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY appointment_id, trigger_code, user_id
        ORDER BY created_at ASC
      ) as rn
    FROM email_notifications
    WHERE appointment_id IS NOT NULL
  ) t
  WHERE rn > 1
);

-- Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_appointment_notification
ON email_notifications (appointment_id, trigger_code, user_id)
WHERE appointment_id IS NOT NULL;

-- Verify the constraint was added
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'email_notifications'
  AND indexname = 'idx_unique_appointment_notification';
