import { db } from './server/db';

// Create tables for Professional Qualification Verification
const createTables = async () => {
  console.log('Creating Professional Qualification Verification tables...');
  
  const sql = `
    -- Doctor Qualifications table
    CREATE TABLE IF NOT EXISTS doctor_qualifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
      qualification_type VARCHAR(50) NOT NULL, -- 'medical_degree', 'specialty_certification', 'license'
      issuing_authority VARCHAR(255) NOT NULL,
      qualification_number VARCHAR(255) NOT NULL,
      issue_date DATE,
      expiry_date DATE,
      
      -- Verification Status
      verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'expired', 'revoked'
      verification_date DATE,
      verification_method VARCHAR(255),
      verification_reference VARCHAR(255),
      
      -- EU Recognition
      eu_recognition_status VARCHAR(50), -- 'automatic', 'general_system', 'not_recognized'
      home_member_state VARCHAR(100),
      host_member_states TEXT[], -- Array of countries where recognized
      
      -- Supporting Documents
      supporting_documents JSONB,
      document_urls TEXT[],
      
      -- Additional Details
      qualification_country VARCHAR(100),
      qualification_language VARCHAR(50),
      specialization VARCHAR(255),
      institution_name VARCHAR(255),
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Professional Insurance table
    CREATE TABLE IF NOT EXISTS professional_insurance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
      insurance_provider VARCHAR(255) NOT NULL,
      policy_number VARCHAR(255) NOT NULL,
      coverage_amount DECIMAL(12, 2),
      coverage_currency VARCHAR(10) DEFAULT 'EUR',
      coverage_territory VARCHAR(255) NOT NULL,
      
      -- Coverage Dates
      effective_date DATE NOT NULL,
      expiry_date DATE NOT NULL,
      
      -- Coverage Details
      coverage_type VARCHAR(100), -- 'medical_malpractice', 'professional_liability', 'general_liability'
      coverage_scope JSONB, -- Detailed coverage areas
      exclusions JSONB,
      deductible DECIMAL(10, 2),
      
      -- Verification
      verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'expired'
      verification_date DATE,
      verification_notes TEXT,
      
      -- Compliance
      meets_eu_requirements BOOLEAN DEFAULT false,
      meets_host_state_requirements JSONB, -- { "FR": true, "DE": false, ... }
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Cross-Border Practice Declarations table
    CREATE TABLE IF NOT EXISTS cross_border_declarations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
      declaration_type VARCHAR(50) NOT NULL, -- 'temporary_provision', 'permanent_establishment'
      
      -- Home State Information
      home_member_state VARCHAR(100) NOT NULL,
      home_registration_number VARCHAR(255),
      home_professional_body VARCHAR(255),
      
      -- Host State Information
      host_member_state VARCHAR(100) NOT NULL,
      host_registration_number VARCHAR(255),
      host_professional_body VARCHAR(255),
      
      -- Declaration Details
      declaration_date DATE NOT NULL,
      validity_start_date DATE NOT NULL,
      validity_end_date DATE,
      services_to_provide TEXT[],
      
      -- Status
      status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
      approval_date DATE,
      rejection_reason TEXT,
      
      -- Requirements
      language_competency_verified BOOLEAN DEFAULT false,
      language_certificate_reference VARCHAR(255),
      adaptation_period_required BOOLEAN DEFAULT false,
      adaptation_period_completed BOOLEAN DEFAULT false,
      aptitude_test_required BOOLEAN DEFAULT false,
      aptitude_test_passed BOOLEAN DEFAULT false,
      
      -- Supporting Documents
      supporting_documents JSONB,
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Qualification Verification Logs table
    CREATE TABLE IF NOT EXISTS qualification_verification_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
      qualification_id UUID REFERENCES doctor_qualifications(id),
      
      -- Verification Details
      verification_type VARCHAR(100) NOT NULL, -- 'automatic', 'manual', 'api_check', 'document_review'
      verification_source VARCHAR(255), -- 'EU_database', 'national_registry', 'manual_review'
      verification_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
      
      -- Verification Result
      verification_result VARCHAR(50) NOT NULL, -- 'verified', 'rejected', 'pending_info', 'failed'
      verification_details JSONB,
      discrepancies_found JSONB,
      
      -- Verifier Information
      verified_by INTEGER REFERENCES users(id),
      verifier_notes TEXT,
      
      -- API/System Details
      api_endpoint_used VARCHAR(500),
      api_response JSONB,
      system_metadata JSONB,
      
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- National Medical Registries table
    CREATE TABLE IF NOT EXISTS national_medical_registries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      country_code VARCHAR(10) NOT NULL,
      country_name VARCHAR(100) NOT NULL,
      registry_name VARCHAR(255) NOT NULL,
      registry_url VARCHAR(500),
      api_endpoint VARCHAR(500),
      
      -- Access Configuration
      api_key_required BOOLEAN DEFAULT false,
      authentication_type VARCHAR(50), -- 'oauth', 'api_key', 'basic', 'none'
      rate_limit INTEGER, -- requests per minute
      
      -- Registry Details
      registry_type VARCHAR(100), -- 'national', 'regional', 'specialty'
      specialties_covered TEXT[],
      verification_available BOOLEAN DEFAULT false,
      real_time_check BOOLEAN DEFAULT false,
      
      -- Data Format
      data_format VARCHAR(50), -- 'json', 'xml', 'html_scrape'
      field_mappings JSONB,
      
      -- Status
      is_active BOOLEAN DEFAULT true,
      last_checked TIMESTAMP,
      availability_status VARCHAR(50), -- 'online', 'offline', 'maintenance'
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- EU Professional Cards table (EPC)
    CREATE TABLE IF NOT EXISTS eu_professional_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
      epc_number VARCHAR(255) UNIQUE NOT NULL,
      
      -- Card Details
      issue_date DATE NOT NULL,
      expiry_date DATE NOT NULL,
      issuing_authority VARCHAR(255),
      issuing_country VARCHAR(100),
      
      -- Professional Information
      professional_title VARCHAR(255),
      specializations TEXT[],
      qualifications_included JSONB,
      
      -- Recognition Status
      recognized_in_countries TEXT[],
      temporary_mobility_declaration BOOLEAN DEFAULT false,
      permanent_establishment BOOLEAN DEFAULT false,
      
      -- Verification
      verification_status VARCHAR(50) DEFAULT 'pending',
      last_verification_date DATE,
      verification_url VARCHAR(500),
      
      -- Digital Signature
      digital_signature TEXT,
      signature_valid BOOLEAN,
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_qualifications_doctor ON doctor_qualifications(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_qualifications_status ON doctor_qualifications(verification_status);
    CREATE INDEX IF NOT EXISTS idx_qualifications_type ON doctor_qualifications(qualification_type);
    CREATE INDEX IF NOT EXISTS idx_insurance_doctor ON professional_insurance(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_insurance_status ON professional_insurance(verification_status);
    CREATE INDEX IF NOT EXISTS idx_insurance_expiry ON professional_insurance(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_cross_border_doctor ON cross_border_declarations(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_cross_border_status ON cross_border_declarations(status);
    CREATE INDEX IF NOT EXISTS idx_verification_logs_doctor ON qualification_verification_logs(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_registries_country ON national_medical_registries(country_code);
    CREATE INDEX IF NOT EXISTS idx_epc_doctor ON eu_professional_cards(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_epc_number ON eu_professional_cards(epc_number);
  `;

  try {
    await db.execute(sql);
    console.log('✅ Professional Qualification Verification tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

// Run the creation
createTables().then(() => {
  console.log('Database setup complete');
  process.exit(0);
}).catch((error) => {
  console.error('Failed to create tables:', error);
  process.exit(1);
});