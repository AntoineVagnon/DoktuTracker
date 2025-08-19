import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function setupSecurityTables() {
  console.log('🔐 Setting up Phase 6 Security Tables in Supabase...');
  
  try {
    // Create encryption_keys table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key_name VARCHAR(255) NOT NULL UNIQUE,
        key_type VARCHAR(50) NOT NULL,
        algorithm VARCHAR(100) NOT NULL,
        key_version INTEGER DEFAULT 1,
        key_material TEXT,
        rotation_period_days INTEGER DEFAULT 90,
        last_rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);
    console.log('✅ Created encryption_keys table in Supabase');

    // Create access_control_roles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS access_control_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        health_data_access VARCHAR(100),
        admin_functions VARCHAR(100),
        patient_data_access VARCHAR(100),
        audit_log_access VARCHAR(100),
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created access_control_roles table in Supabase');

    // Create user_role_assignments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_role_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        role_id UUID NOT NULL REFERENCES access_control_roles(id) ON DELETE CASCADE,
        assigned_by UUID,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        UNIQUE(user_id, role_id)
      )
    `);
    console.log('✅ Created user_role_assignments table in Supabase');

    // Create data_access_audit_log table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS data_access_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT,
        resource_type VARCHAR(100) NOT NULL,
        resource_id UUID,
        action VARCHAR(50) NOT NULL,
        access_granted BOOLEAN NOT NULL,
        denial_reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        session_id VARCHAR(255),
        request_metadata JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created data_access_audit_log table in Supabase');

    // Create indexes for audit log
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_user_id ON data_access_audit_log(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON data_access_audit_log(timestamp)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_resource ON data_access_audit_log(resource_type, resource_id)`);
    console.log('✅ Created audit log indexes');

    // Create encrypted_columns table
    await db.execute(sql`
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
      )
    `);
    console.log('✅ Created encrypted_columns table in Supabase');

    // Create secure_sessions table
    await db.execute(sql`
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
      )
    `);
    console.log('✅ Created secure_sessions table in Supabase');

    // Create session indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_session_token ON secure_sessions(session_token)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_session_user ON secure_sessions(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_session_expires ON secure_sessions(expires_at)`);
    console.log('✅ Created session indexes');

    // Create data_breach_incidents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS data_breach_incidents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        incident_date TIMESTAMP NOT NULL,
        detected_date TIMESTAMP NOT NULL,
        reported_date TIMESTAMP,
        incident_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
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
      )
    `);
    console.log('✅ Created data_breach_incidents table in Supabase');

    // Insert default roles
    await db.execute(sql`
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
      ON CONFLICT (role_name) DO NOTHING
    `);
    console.log('✅ Inserted default security roles');

    // Insert encryption keys
    await db.execute(sql`
      INSERT INTO encryption_keys (key_name, key_type, algorithm, rotation_period_days)
      VALUES 
        ('health_data_key', 'data_at_rest', 'AES-256-GCM', 90),
        ('transport_key', 'data_in_transit', 'TLS-1.3', 365),
        ('video_key', 'video', 'WebRTC-DTLS-SRTP', 30)
      ON CONFLICT (key_name) DO NOTHING
    `);
    console.log('✅ Created encryption key records');

    // Mark sensitive columns for encryption
    await db.execute(sql`
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
      ON CONFLICT (table_name, column_name) DO NOTHING
    `);
    console.log('✅ Marked sensitive columns for encryption');

    console.log('\n🎉 Phase 6: Data Security Enhancement tables successfully created in Supabase!');
    console.log('📦 All security data is now stored in your Supabase database');
    console.log('🔒 Tables created:');
    console.log('   - encryption_keys');
    console.log('   - access_control_roles');
    console.log('   - user_role_assignments');
    console.log('   - data_access_audit_log');
    console.log('   - encrypted_columns');
    console.log('   - secure_sessions');
    console.log('   - data_breach_incidents');
    console.log('\n✅ Your Doktu platform now has comprehensive security tracking in Supabase!');

  } catch (error) {
    console.error('❌ Error creating security tables:', error);
    throw error;
  }
}

// Run the setup
setupSecurityTables()
  .then(() => {
    console.log('\n✅ Security setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });