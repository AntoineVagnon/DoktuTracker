-- =====================================================
-- DOKTU MEDICAL PLATFORM - DATABASE PERFORMANCE OPTIMIZATION
-- Phase 3: Production Performance Enhancements
-- =====================================================

-- 1. MEDICAL RECORDS PERFORMANCE INDEXES
-- =====================================================

-- Index for patient medical records lookup (most frequent query)
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id_status_date 
ON medical_records (patient_id, status, created_at DESC)
WHERE status = 'active';

-- Index for doctor's patient lookup
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id_date 
ON medical_records (doctor_id, created_at DESC)
WHERE status = 'active';

-- Index for appointment-related medical records
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_id 
ON medical_records (appointment_id)
WHERE appointment_id IS NOT NULL;

-- Composite index for medical record search by type and severity
CREATE INDEX IF NOT EXISTS idx_medical_records_type_severity_date 
ON medical_records (record_type, severity, created_at DESC);

-- 2. USER MANAGEMENT PERFORMANCE INDEXES
-- =====================================================

-- Index for user authentication (email lookup)
CREATE INDEX IF NOT EXISTS idx_users_email_status 
ON users (email, status)
WHERE status IN ('active', 'pending_approval');

-- Index for role-based user queries
CREATE INDEX IF NOT EXISTS idx_users_role_status_created 
ON users (role, status, created_at DESC);

-- Index for user verification status
CREATE INDEX IF NOT EXISTS idx_users_verified_role 
ON users (is_verified, role)
WHERE is_verified = true;

-- 3. APPOINTMENT SYSTEM OPTIMIZATION
-- =====================================================

-- Index for patient appointments lookup
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id_date_status 
ON appointments (patient_id, appointment_date DESC, status);

-- Index for doctor availability and appointments
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id_date_status 
ON appointments (doctor_id, appointment_date, status)
WHERE status IN ('scheduled', 'confirmed', 'in_progress');

-- Index for upcoming appointments (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_appointments_date_status 
ON appointments (appointment_date, status)
WHERE status IN ('scheduled', 'confirmed') 
AND appointment_date >= CURRENT_DATE;

-- 4. AUDIT TRAIL PERFORMANCE
-- =====================================================

-- Index for audit logs by user and date (GDPR compliance)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_date 
ON audit_logs (user_id, created_at DESC);

-- Index for audit logs by action type (security monitoring)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date 
ON audit_logs (action, created_at DESC);

-- Index for patient data access tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_data_access 
ON audit_logs (resource_type, resource_id, created_at DESC)
WHERE resource_type IN ('medical_record', 'health_profile', 'patient_data');

-- 5. MEDICAL RECORD ACCESS LOGS
-- =====================================================

-- Index for medical record access by patient
CREATE INDEX IF NOT EXISTS idx_medical_record_access_patient_date 
ON medical_record_access (patient_id, accessed_at DESC);

-- Index for access by user (doctor/admin tracking)
CREATE INDEX IF NOT EXISTS idx_medical_record_access_user_date 
ON medical_record_access (accessed_by, accessed_at DESC);

-- Index for failed access attempts (security monitoring)
CREATE INDEX IF NOT EXISTS idx_medical_record_access_denied 
ON medical_record_access (access_granted, accessed_at DESC)
WHERE access_granted = false;

-- 6. HEALTH PROFILES OPTIMIZATION
-- =====================================================

-- Index for active health profiles
CREATE INDEX IF NOT EXISTS idx_health_profiles_patient_active_version 
ON patient_health_profiles (patient_id, is_active, version DESC)
WHERE is_active = true;

-- Index for health profile version history
CREATE INDEX IF NOT EXISTS idx_health_profiles_patient_version 
ON patient_health_profiles (patient_id, version DESC, updated_at DESC);

-- 7. NOTIFICATION SYSTEM PERFORMANCE
-- =====================================================

-- Index for unread notifications by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications (user_id, is_read, created_at DESC)
WHERE is_read = false;

-- Index for notification type and priority
CREATE INDEX IF NOT EXISTS idx_notifications_type_priority_date 
ON notifications (notification_type, priority, created_at DESC);

-- 8. PRESCRIPTION MANAGEMENT
-- =====================================================

-- Index for patient prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date_status 
ON prescriptions (patient_id, prescribed_date DESC, status);

-- Index for doctor prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_date 
ON prescriptions (doctor_id, prescribed_date DESC);

-- Index for active prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_active_expiry 
ON prescriptions (patient_id, expiry_date)
WHERE status = 'active' AND expiry_date >= CURRENT_DATE;

-- 9. GDPR DATA REQUESTS TRACKING
-- =====================================================

-- Index for data subject requests
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_user_status_date 
ON data_subject_requests (user_id, status, created_at DESC);

-- Index for request processing
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status_priority 
ON data_subject_requests (status, priority, created_at)
WHERE status IN ('pending', 'processing');

-- 10. SEARCH AND ANALYTICS OPTIMIZATION
-- =====================================================

-- Full-text search index for medical records (if supported)
-- CREATE INDEX IF NOT EXISTS idx_medical_records_fulltext 
-- ON medical_records USING gin(to_tsvector('english', diagnosis || ' ' || symptoms || ' ' || treatment));

-- Index for analytics queries (aggregation optimization)
CREATE INDEX IF NOT EXISTS idx_appointments_created_month_year 
ON appointments (EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), status);

CREATE INDEX IF NOT EXISTS idx_medical_records_created_month_year 
ON medical_records (EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), record_type);

-- 11. PERFORMANCE MONITORING INDEXES
-- =====================================================

-- Index for system health monitoring
CREATE INDEX IF NOT EXISTS idx_audit_logs_system_health 
ON audit_logs (action, created_at DESC)
WHERE action LIKE '%health%' OR action LIKE '%performance%';

-- 12. CLEANUP AND MAINTENANCE INDEXES
-- =====================================================

-- Index for data retention and cleanup
CREATE INDEX IF NOT EXISTS idx_audit_logs_cleanup_date 
ON audit_logs (created_at)
WHERE created_at < (CURRENT_DATE - INTERVAL '7 years');

CREATE INDEX IF NOT EXISTS idx_medical_record_access_cleanup 
ON medical_record_access (accessed_at)
WHERE accessed_at < (CURRENT_DATE - INTERVAL '7 years');

-- =====================================================
-- PERFORMANCE ANALYSIS QUERIES
-- =====================================================

-- Query to check index usage
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_tup_read DESC;

-- Query to identify slow queries
-- SELECT query, mean_time, calls, total_time 
-- FROM pg_stat_statements 
-- ORDER BY mean_time DESC 
-- LIMIT 10;

-- Query to check table sizes and index efficiency
-- SELECT 
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
--   pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- MAINTENANCE PROCEDURES
-- =====================================================

-- Analyze tables for query planner optimization
ANALYZE users;
ANALYZE appointments;
ANALYZE medical_records;
ANALYZE audit_logs;
ANALYZE medical_record_access;
ANALYZE patient_health_profiles;
ANALYZE notifications;
ANALYZE prescriptions;
ANALYZE data_subject_requests;

-- Update table statistics
-- This should be run periodically in production
-- VACUUM ANALYZE users;
-- VACUUM ANALYZE appointments;
-- VACUUM ANALYZE medical_records;
-- VACUUM ANALYZE audit_logs;

COMMIT;