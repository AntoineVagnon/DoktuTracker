import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './shared/schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@db.hzmrkvooqjbxptqjqxii.supabase.co:5432/postgres';
const sql = postgres(connectionString);
const db = drizzle(sql, { schema });

async function createSecurityTables() {
  console.log('🔐 Creating security enhancement tables...');

  try {
    // 1. Create encryption keys table
    await sql`
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
      )
    `;
    console.log('✅ Created encryption_keys table');

    // 2. Create access control roles table
    await sql`
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
      )
    `;
    console.log('✅ Created access_control_roles table');

    // 3. Create user role assignments table
    await sql`
      CREATE TABLE IF NOT EXISTS user_role_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES access_control_roles(id) ON DELETE CASCADE,
        assigned_by UUID REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        UNIQUE(user_id, role_id)
      )
    `;
    console.log('✅ Created user_role_assignments table');

    // 4. Create data access audit log table
    await sql`
      CREATE TABLE IF NOT EXISTS data_access_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        resource_type VARCHAR(100) NOT NULL, -- 'health_data', 'patient_record', 'consultation', etc.
        resource_id UUID,
        action VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete', 'export'
        access_granted BOOLEAN NOT NULL,
        denial_reason TEXT,
        ip_address INET,
        user_agent TEXT,
        session_id VARCHAR(255),
        request_metadata JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_user_id (user_id),
        INDEX idx_audit_timestamp (timestamp),
        INDEX idx_audit_resource (resource_type, resource_id)
      )
    `;
    console.log('✅ Created data_access_audit_log table');

    // 5. Create encrypted data columns tracking table
    await sql`
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
    `;
    console.log('✅ Created encrypted_columns table');

    // 6. Create session management table
    await sql`
      CREATE TABLE IF NOT EXISTS secure_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_token VARCHAR(500) NOT NULL UNIQUE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID REFERENCES access_control_roles(id),
        jwt_claims JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP,
        revoke_reason TEXT,
        is_active BOOLEAN DEFAULT true,
        INDEX idx_session_token (session_token),
        INDEX idx_session_user (user_id),
        INDEX idx_session_expires (expires_at)
      )
    `;
    console.log('✅ Created secure_sessions table');

    // 7. Create data breach incident table
    await sql`
      CREATE TABLE IF NOT EXISTS data_breach_incidents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        incident_date TIMESTAMP NOT NULL,
        detected_date TIMESTAMP NOT NULL,
        reported_date TIMESTAMP,
        incident_type VARCHAR(100) NOT NULL, -- 'unauthorized_access', 'data_leak', 'system_breach'
        severity VARCHAR(50) NOT NULL, -- 'critical', 'high', 'medium', 'low'
        affected_records INTEGER,
        affected_users UUID[] DEFAULT '{}',
        description TEXT NOT NULL,
        root_cause TEXT,
        remediation_actions TEXT,
        notification_sent BOOLEAN DEFAULT false,
        notification_date TIMESTAMP,
        reported_to_authority BOOLEAN DEFAULT false,
        authority_report_date TIMESTAMP,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Created data_breach_incidents table');

    // Insert default roles
    await sql`
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
    `;
    console.log('✅ Inserted default security roles');

    // Insert sample encryption keys (in production, these would be managed by KMS)
    await sql`
      INSERT INTO encryption_keys (key_name, key_type, algorithm, rotation_period_days)
      VALUES 
        ('health_data_key', 'data_at_rest', 'AES-256-GCM', 90),
        ('transport_key', 'data_in_transit', 'TLS-1.3', 365),
        ('video_key', 'video', 'WebRTC-DTLS-SRTP', 30)
      ON CONFLICT (key_name) DO NOTHING
    `;
    console.log('✅ Created encryption key records');

    // Mark sensitive columns for encryption
    await sql`
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
    `;
    console.log('✅ Marked sensitive columns for encryption');

    console.log('\n🎉 Phase 6: Data Security Enhancements tables created successfully!');
    
    // Display summary
    const roleCount = await sql`SELECT COUNT(*) FROM access_control_roles`;
    const keyCount = await sql`SELECT COUNT(*) FROM encryption_keys`;
    const columnCount = await sql`SELECT COUNT(*) FROM encrypted_columns`;
    
    console.log('\n📊 Summary:');
    console.log(`   - Security roles defined: ${roleCount[0].count}`);
    console.log(`   - Encryption keys configured: ${keyCount[0].count}`);
    console.log(`   - Columns marked for encryption: ${columnCount[0].count}`);
    console.log(`   - Audit logging enabled`);
    console.log(`   - Session management configured`);
    console.log(`   - Data breach tracking ready`);

  } catch (error) {
    console.error('❌ Error creating security tables:', error);
    throw error;
  }
}

// Run the setup
createSecurityTables()
  .then(() => {
    console.log('\n✅ Security enhancement setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });