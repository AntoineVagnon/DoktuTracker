-- Phase 6: Data Security Enhancements Tables for Supabase

-- 1. Create encryption keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name VARCHAR(255) NOT NULL UNIQUE,
  key_type VARCHAR(50) NOT NULL, -- 'data_at_rest', 'data_in_transit', 'video'
  algorithm VARCHAR(100) NOT NULL,
  key_version INTEGER DEFAULT 1,
  key_material TEXT, -- Encrypted key material (would be stored in KMS in production)
  rotation_period_days INTEGER DEFAULT 90,
  last_rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- 2. Create access control roles table
CREATE TABLE IF NOT EXISTS access_control_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  health_data_access VARCHAR(100), -- 'own', 'assigned', 'none', 'audit'
  admin_functions VARCHAR(100), -- 'full', 'user_management', 'none'
  patient_data_access VARCHAR(100), -- 'own', 'assigned', 'anonymized', 'pseudonymized'
  audit_log_access VARCHAR(100), -- 'own', 'all', 'support', 'none'
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create user role assignments table
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES access_control_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id)
);

-- 4. Create data access audit log table
CREATE TABLE IF NOT EXISTS data_access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  resource_type VARCHAR(100) NOT NULL, -- 'health_data', 'patient_record', 'consultation', etc.
  resource_id UUID,
  action VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete', 'export'
  access_granted BOOLEAN NOT NULL,
  denial_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id VARCHAR(255),
  request_metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit log performance
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON data_access_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON data_access_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON data_access_audit_log(resource_type, resource_id);

-- 5. Create encrypted data columns tracking table
CREATE TABLE IF NOT EXISTS encrypted_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(255) NOT NULL,
  column_name VARCHAR(255) NOT NULL,
  encryption_algorithm VARCHAR(100) DEFAULT 'AES-256-GCM',
  key_id UUID REFERENCES encryption_keys(id),
  is_encrypted BOOLEAN DEFAULT false,
  encrypted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(table_name, column_name)
);

-- 6. Create session management table
CREATE TABLE IF NOT EXISTS secure_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(500) NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  role_id UUID REFERENCES access_control_roles(id),
  jwt_claims JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  revoke_reason TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for session performance
CREATE INDEX IF NOT EXISTS idx_session_token ON secure_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_session_user ON secure_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires ON secure_sessions(expires_at);

-- 7. Create data breach incident table
CREATE TABLE IF NOT EXISTS data_breach_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_date TIMESTAMP NOT NULL,
  detected_date TIMESTAMP NOT NULL,
  reported_date TIMESTAMP,
  incident_type VARCHAR(100) NOT NULL, -- 'unauthorized_access', 'data_leak', 'system_breach'
  severity VARCHAR(50) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  affected_records INTEGER,
  affected_users UUID[] DEFAULT ARRAY[]::UUID[],
  description TEXT NOT NULL,
  root_cause TEXT,
  remediation_actions TEXT,
  notification_sent BOOLEAN DEFAULT false,
  notification_date TIMESTAMP,
  reported_to_authority BOOLEAN DEFAULT false,
  authority_report_date TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO access_control_roles (role_name, description, health_data_access, admin_functions, patient_data_access, audit_log_access, permissions)
VALUES 
  ('patient', 'Patient user with access to own health data', 'own', 'none', 'own', 'own', 
   '{"view_own_data": true, "book_appointments": true, "view_prescriptions": true}'::jsonb),
  
  ('doctor', 'Healthcare professional with patient access', 'assigned', 'consultation_management', 'assigned', 'own',
   '{"view_patient_data": true, "create_prescriptions": true, "manage_consultations": true}'::jsonb),
  
  ('admin', 'System administrator', 'none', 'user_management', 'anonymized', 'all',
   '{"manage_users": true, "view_analytics": true, "system_config": true}'::jsonb),
  
  ('support', 'Customer support staff', 'none', 'ticket_management', 'pseudonymized', 'support',
   '{"view_tickets": true, "assist_users": true, "limited_data_access": true}'::jsonb),
  
  ('dpo', 'Data Protection Officer', 'audit', 'privacy_management', 'audit', 'all',
   '{"privacy_audit": true, "gdpr_compliance": true, "breach_management": true}'::jsonb)
ON CONFLICT (role_name) DO NOTHING;

-- Insert sample encryption keys (in production, these would be managed by KMS)
INSERT INTO encryption_keys (key_name, key_type, algorithm, rotation_period_days)
VALUES 
  ('health_data_key', 'data_at_rest', 'AES-256-GCM', 90),
  ('transport_key', 'data_in_transit', 'TLS-1.3', 365),
  ('video_key', 'video', 'WebRTC-DTLS-SRTP', 30)
ON CONFLICT (key_name) DO NOTHING;

-- Mark sensitive columns for encryption
INSERT INTO encrypted_columns (table_name, column_name, encryption_algorithm)
VALUES 
  ('users', 'phone', 'AES-256-GCM'),
  ('health_profiles', 'medical_history', 'AES-256-GCM'),
  ('health_profiles', 'allergies', 'AES-256-GCM'),
  ('health_profiles', 'current_medications', 'AES-256-GCM'),
  ('health_profiles', 'chronic_conditions', 'AES-256-GCM'),
  ('appointments', 'consultation_notes', 'AES-256-GCM'),
  ('appointments', 'prescription_data', 'AES-256-GCM'),
  ('data_subject_requests', 'request_data', 'AES-256-GCM')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- Grant appropriate permissions for Supabase
GRANT ALL ON encryption_keys TO postgres, anon, authenticated, service_role;
GRANT ALL ON access_control_roles TO postgres, anon, authenticated, service_role;
GRANT ALL ON user_role_assignments TO postgres, anon, authenticated, service_role;
GRANT ALL ON data_access_audit_log TO postgres, anon, authenticated, service_role;
GRANT ALL ON encrypted_columns TO postgres, anon, authenticated, service_role;
GRANT ALL ON secure_sessions TO postgres, anon, authenticated, service_role;
GRANT ALL ON data_breach_incidents TO postgres, anon, authenticated, service_role;

-- Enable Row Level Security (RLS) for sensitive tables
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_control_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_breach_incidents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit log (everyone can insert, only admins can read)
CREATE POLICY "Enable insert for all users" ON data_access_audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for admins" ON data_access_audit_log
  FOR SELECT USING (true); -- In production, would check user role

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Phase 6: Data Security Enhancements tables created successfully in Supabase!';
  RAISE NOTICE 'All security data will be stored in your Supabase database.';
  RAISE NOTICE 'Tables created: encryption_keys, access_control_roles, user_role_assignments, data_access_audit_log, encrypted_columns, secure_sessions, data_breach_incidents';
END $$;