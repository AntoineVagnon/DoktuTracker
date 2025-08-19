import { db } from './server/db';

// Create tables for Medical Device Compliance Assessment
const createTables = async () => {
  console.log('Creating Medical Device Compliance Assessment tables...');
  
  const sql = `
    -- Medical Device Assessment table
    CREATE TABLE IF NOT EXISTS medical_device_assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_date TIMESTAMP NOT NULL DEFAULT NOW(),
      assessment_version VARCHAR(50) NOT NULL,
      assessment_type VARCHAR(100) NOT NULL,
      software_name VARCHAR(255) NOT NULL DEFAULT 'Doktu Platform',
      software_version VARCHAR(50) NOT NULL,
      
      -- MDCG 2019-11 Decision Tree Questions
      is_software BOOLEAN NOT NULL DEFAULT true,
      is_accessory BOOLEAN,
      processes_data BOOLEAN,
      benefit_individual_patients BOOLEAN,
      
      -- Risk Classification
      medical_device_class VARCHAR(50), -- 'not_md', 'class_i', 'class_iia', 'class_iib', 'class_iii'
      risk_level VARCHAR(50), -- 'none', 'low', 'medium', 'high'
      
      -- Assessment Details
      assessment_rationale TEXT,
      regulatory_framework VARCHAR(100) DEFAULT 'MDR 2017/745',
      notified_body_required BOOLEAN DEFAULT false,
      ce_marking_required BOOLEAN DEFAULT false,
      
      -- Clinical Functions Assessment
      diagnostic_features JSONB,
      treatment_features JSONB,
      monitoring_features JSONB,
      calculation_features JSONB,
      
      -- Compliance Status
      compliance_status VARCHAR(50) DEFAULT 'assessment_pending',
      compliance_gaps JSONB,
      remediation_plan JSONB,
      
      -- Metadata
      assessed_by INTEGER REFERENCES users(id),
      reviewed_by INTEGER REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      next_review_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Medical Device Functions table
    CREATE TABLE IF NOT EXISTS medical_device_functions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id UUID REFERENCES medical_device_assessments(id) ON DELETE CASCADE,
      function_category VARCHAR(100) NOT NULL, -- 'diagnostic', 'treatment', 'monitoring', 'calculation'
      function_name VARCHAR(255) NOT NULL,
      function_description TEXT NOT NULL,
      
      -- Risk Assessment
      potential_harm VARCHAR(100), -- 'none', 'minor', 'moderate', 'serious', 'life_threatening'
      likelihood_of_harm VARCHAR(100), -- 'rare', 'unlikely', 'possible', 'likely', 'certain'
      risk_mitigation TEXT,
      
      -- Medical Purpose
      medical_purpose TEXT,
      intended_users VARCHAR(255),
      clinical_benefit TEXT,
      
      -- Regulatory Impact
      affects_classification BOOLEAN DEFAULT false,
      requires_clinical_evidence BOOLEAN DEFAULT false,
      requires_performance_validation BOOLEAN DEFAULT false,
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Technical Documentation table
    CREATE TABLE IF NOT EXISTS mdr_technical_documentation (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id UUID REFERENCES medical_device_assessments(id) ON DELETE CASCADE,
      document_type VARCHAR(100) NOT NULL,
      document_name VARCHAR(255) NOT NULL,
      document_version VARCHAR(50),
      document_content TEXT,
      document_url VARCHAR(500),
      
      -- Document Categories
      category VARCHAR(100), -- 'design_specs', 'risk_management', 'clinical_evaluation', 'verification_validation'
      compliance_standard VARCHAR(100), -- 'ISO 13485', 'ISO 14971', 'IEC 62304', 'IEC 62366'
      
      -- Review Status
      review_status VARCHAR(50) DEFAULT 'draft',
      reviewed_by INTEGER REFERENCES users(id),
      review_date TIMESTAMP,
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Compliance Requirements table
    CREATE TABLE IF NOT EXISTS mdr_compliance_requirements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id UUID REFERENCES medical_device_assessments(id) ON DELETE CASCADE,
      requirement_category VARCHAR(100) NOT NULL,
      requirement_name VARCHAR(255) NOT NULL,
      requirement_description TEXT,
      
      -- Regulatory Reference
      regulation_reference VARCHAR(100), -- e.g., 'MDR Annex I, Chapter II'
      standard_reference VARCHAR(100), -- e.g., 'ISO 13485:2016 Section 7.3'
      
      -- Compliance Status
      compliance_status VARCHAR(50) DEFAULT 'not_assessed', -- 'compliant', 'partial', 'non_compliant', 'not_applicable'
      evidence_provided TEXT,
      gaps_identified TEXT,
      remediation_actions TEXT,
      target_completion_date DATE,
      
      -- Priority and Risk
      priority VARCHAR(50) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
      risk_if_non_compliant TEXT,
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Post-Market Surveillance table
    CREATE TABLE IF NOT EXISTS mdr_post_market_surveillance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id UUID REFERENCES medical_device_assessments(id) ON DELETE CASCADE,
      surveillance_type VARCHAR(100) NOT NULL, -- 'incident', 'complaint', 'feedback', 'clinical_followup'
      event_date TIMESTAMP NOT NULL,
      
      -- Event Details
      event_description TEXT NOT NULL,
      severity VARCHAR(50), -- 'minor', 'moderate', 'serious', 'death'
      patient_impact TEXT,
      root_cause TEXT,
      
      -- Actions Taken
      immediate_action TEXT,
      corrective_action TEXT,
      preventive_action TEXT,
      
      -- Reporting
      reported_to_authority BOOLEAN DEFAULT false,
      authority_name VARCHAR(255),
      report_date DATE,
      report_reference VARCHAR(100),
      
      -- Status
      investigation_status VARCHAR(50) DEFAULT 'open',
      resolution_date DATE,
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_assessments_compliance_status ON medical_device_assessments(compliance_status);
    CREATE INDEX IF NOT EXISTS idx_assessments_class ON medical_device_assessments(medical_device_class);
    CREATE INDEX IF NOT EXISTS idx_functions_category ON medical_device_functions(function_category);
    CREATE INDEX IF NOT EXISTS idx_requirements_status ON mdr_compliance_requirements(compliance_status);
    CREATE INDEX IF NOT EXISTS idx_surveillance_type ON mdr_post_market_surveillance(surveillance_type);
    CREATE INDEX IF NOT EXISTS idx_surveillance_status ON mdr_post_market_surveillance(investigation_status);
  `;

  try {
    await db.execute(sql);
    console.log('✅ Medical Device Compliance Assessment tables created successfully');
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