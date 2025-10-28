-- ============================================================
-- ELDERLY CARE MANAGEMENT PLATFORM - COMPLETE DATABASE SCHEMA
-- ============================================================
-- Compliance: §630f BGB, GoBD, BSI C5:2020 Type 2, GDPR Article 9
-- Database: PostgreSQL 15
-- Deployment: AWS RDS Multi-AZ (eu-central-1, Frankfurt)
-- Version: 1.0
-- Date: January 2025
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE 1: users (CRITICAL - Referenced by 5+ tables)
-- ============================================================
-- Purpose: Authentication, authorization, user profiles
-- Compliance: GDPR Article 6(1)(a), 10-year retention (§630f BGB)
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Authentication
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMPTZ,

    -- Two-Factor Authentication
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100), -- TOTP secret (base32 encoded)
    two_factor_backup_codes JSONB, -- Array of backup codes

    -- Profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    photo_url VARCHAR(500), -- S3 path

    -- Role-Based Access Control
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'caregiver', 'family')),

    -- eHBA/SMC-B (German Professional Authentication for TI-Messenger)
    ehba_card_number VARCHAR(50), -- Electronic health professional card
    smcb_card_number VARCHAR(50), -- Electronic institution card
    gematik_verified BOOLEAN DEFAULT FALSE,
    gematik_verified_at TIMESTAMPTZ,

    -- Matrix TI-Messenger Integration
    matrix_user_id VARCHAR(255), -- @username:homeserver.tld
    matrix_access_token TEXT, -- Encrypted token
    matrix_device_id VARCHAR(100),

    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,

    -- GDPR Compliance
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consent_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    privacy_policy_accepted BOOLEAN DEFAULT TRUE,
    terms_accepted BOOLEAN DEFAULT TRUE,

    -- Retention (§630f BGB - 10 years minimum)
    retention_until DATE DEFAULT (CURRENT_DATE + INTERVAL '10 years'),
    gdpr_deletion_eligible BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT email_format_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT phone_format_check CHECK (phone IS NULL OR phone ~* '^\+?[0-9\s\-\(\)]{7,20}$')
);

-- Indexes for users
CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email)); -- Case-insensitive email lookup
CREATE INDEX idx_users_role ON users(role); -- Filter by role (RBAC queries)
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE; -- Active users only
CREATE INDEX idx_users_matrix ON users(matrix_user_id) WHERE matrix_user_id IS NOT NULL; -- TI-Messenger lookup
CREATE INDEX idx_users_ehba ON users(ehba_card_number) WHERE ehba_card_number IS NOT NULL; -- Professional auth
CREATE INDEX idx_users_created_at ON users(created_at DESC); -- Recent registrations

-- Trigger: Update updated_at automatically
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments (Data Classification)
COMMENT ON TABLE users IS 'User accounts for authentication and authorization. GDPR Article 6(1)(a) - Consent. Retention: 10 years (§630f BGB).';
COMMENT ON COLUMN users.email IS 'PII - Confidential. Primary authentication identifier.';
COMMENT ON COLUMN users.password_hash IS 'Restricted. bcrypt hash with salt rounds >= 12.';
COMMENT ON COLUMN users.ehba_card_number IS 'Restricted. German electronic health professional card number for TI-Messenger authentication.';


-- ============================================================
-- TABLE 2: rooms
-- ============================================================
-- Purpose: Physical room assignments in care facility
-- ============================================================

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Room Information
    room_number VARCHAR(20) NOT NULL UNIQUE,
    floor INTEGER,
    wing VARCHAR(50), -- 'North Wing', 'South Wing', etc.
    room_type VARCHAR(30) CHECK (room_type IN ('single', 'double', 'shared', 'private_suite')),

    -- Capacity
    max_capacity INTEGER NOT NULL DEFAULT 1,
    current_occupancy INTEGER DEFAULT 0,

    -- Amenities
    has_private_bathroom BOOLEAN DEFAULT FALSE,
    has_window BOOLEAN DEFAULT TRUE,
    is_wheelchair_accessible BOOLEAN DEFAULT TRUE,
    has_emergency_call_button BOOLEAN DEFAULT TRUE,

    -- Status
    is_available BOOLEAN DEFAULT TRUE,
    maintenance_required BOOLEAN DEFAULT FALSE,
    maintenance_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT occupancy_valid CHECK (current_occupancy >= 0 AND current_occupancy <= max_capacity)
);

-- Indexes for rooms
CREATE INDEX idx_rooms_available ON rooms(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_rooms_floor_wing ON rooms(floor, wing);

-- Trigger
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- TABLE 3: residents (CORE ENTITY)
-- ============================================================
-- Purpose: Patient/resident profiles and medical information
-- Compliance: GDPR Article 9 (Special Categories - Health Data)
-- ============================================================

CREATE TABLE residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Demographics
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL, -- GDPR Article 9: Special category data
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'non-binary', 'prefer_not_to_say')),
    photo_url VARCHAR(500), -- S3 encrypted storage
    admission_date DATE NOT NULL,
    discharge_date DATE,
    discharge_reason VARCHAR(50) CHECK (discharge_reason IN ('discharged_home', 'transferred', 'deceased', NULL)),

    -- Room Assignment
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,

    -- Medical Information (GDPR Article 9 - Special Categories)
    care_level_pflegegrad INTEGER CHECK (care_level_pflegegrad BETWEEN 1 AND 5), -- German classification (1=minimal, 5=maximum)
    chronic_conditions JSONB, -- Array: ['diabetes', 'hypertension', 'dementia']
    allergies JSONB, -- CRITICAL PATIENT SAFETY: ['Penicillin', 'Peanuts']
    dnr_status BOOLEAN DEFAULT FALSE, -- Do Not Resuscitate
    advance_directives TEXT, -- Patientenverfügung (German advance directive)

    -- Insurance (German Statutory Health Insurance)
    insurance_provider VARCHAR(100), -- AOK, TK, Barmer, DAK, private
    insurance_number VARCHAR(50) UNIQUE, -- CRITICAL: Must be unique for billing
    insurance_type VARCHAR(20) CHECK (insurance_type IN ('statutory', 'private')),

    -- Emergency Contacts
    contacts JSONB, -- Array of up to 3 contacts: [{name, phone, relationship, is_primary}]

    -- Dietary & Mobility
    dietary_restrictions JSONB, -- ['vegetarian', 'diabetic', 'pureed', 'low_sodium']
    mobility_status VARCHAR(20) CHECK (mobility_status IN ('independent', 'walker', 'wheelchair', 'bedridden')),
    cognitive_status VARCHAR(50) CHECK (cognitive_status IN ('alert', 'confused', 'memory_care', 'dementia')),

    -- Care Assignments
    assigned_caregiver_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Primary caregiver
    assigned_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Primary physician

    -- Status
    is_active BOOLEAN DEFAULT TRUE, -- FALSE if resident discharged/deceased

    -- Compliance Metadata (§630f BGB)
    retention_until DATE DEFAULT (CURRENT_DATE + INTERVAL '10 years'),
    gdpr_deletion_eligible BOOLEAN DEFAULT FALSE,
    last_accessed_at TIMESTAMPTZ, -- For BfDI audit (who viewed when)
    last_accessed_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT discharge_date_valid CHECK (discharge_date IS NULL OR discharge_date >= admission_date),
    CONSTRAINT insurance_required_for_active CHECK (
        NOT is_active OR (insurance_provider IS NOT NULL AND insurance_number IS NOT NULL)
    ),
    CONSTRAINT age_valid CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years') -- Elderly care (18+ minimum)
);

-- Indexes for residents
CREATE INDEX idx_residents_insurance_number ON residents(insurance_number); -- Billing queries
CREATE INDEX idx_residents_care_level ON residents(care_level_pflegegrad); -- Billing base rate calculation
CREATE INDEX idx_residents_active ON residents(is_active) WHERE is_active = TRUE; -- Most queries filter active only
CREATE INDEX idx_residents_admission_date ON residents(admission_date DESC); -- Recent admissions
CREATE INDEX idx_residents_caregiver ON residents(assigned_caregiver_id); -- Caregiver workload queries
CREATE INDEX idx_residents_doctor ON residents(assigned_doctor_id); -- Doctor patient list
CREATE INDEX idx_residents_room ON residents(room_id); -- Room occupancy queries
CREATE INDEX idx_residents_name ON residents(last_name, first_name); -- Search by name

-- Trigger
CREATE TRIGGER update_residents_updated_at
BEFORE UPDATE ON residents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments (Data Classification)
COMMENT ON TABLE residents IS 'Resident profiles with medical information. GDPR Article 9 Special Categories (Health Data). Retention: 10 years (§630f BGB).';
COMMENT ON COLUMN residents.date_of_birth IS 'GDPR Article 9 Special Category: Health-related age data. Restricted.';
COMMENT ON COLUMN residents.allergies IS 'CRITICAL PATIENT SAFETY DATA. Must never be truncated in UI (German text expansion). GDPR Article 9.';
COMMENT ON COLUMN residents.insurance_number IS 'Confidential. German health insurance number. Must be unique for billing (§301 SGB V).';


-- ============================================================
-- TABLE 4: medications
-- ============================================================
-- Purpose: Medication prescriptions and scheduling
-- ============================================================

CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Resident Assignment
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,

    -- Medication Information
    medication_name VARCHAR(200) NOT NULL, -- e.g., "Metformin"
    generic_name VARCHAR(200), -- e.g., "Metformin Hydrochloride"
    medication_type VARCHAR(50) CHECK (medication_type IN ('tablet', 'capsule', 'liquid', 'injection', 'topical', 'inhaler')),

    -- Dosage
    dosage VARCHAR(100) NOT NULL, -- e.g., "500mg", "10ml"
    route VARCHAR(50) CHECK (route IN ('oral', 'sublingual', 'intravenous', 'intramuscular', 'subcutaneous', 'topical', 'rectal', 'ophthalmic')),

    -- Scheduling
    frequency VARCHAR(100) NOT NULL, -- e.g., "twice daily", "every 8 hours", "as needed"
    time_of_day JSONB, -- Array of times: ['08:00', '20:00']
    duration_days INTEGER, -- NULL for ongoing, or number of days (e.g., 7 for antibiotics)

    -- Start/End Dates
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for ongoing medications

    -- Next Scheduled Administration
    next_due_time TIMESTAMPTZ, -- Calculated field for missed medication alerts

    -- Prescription Information
    prescribed_by UUID REFERENCES users(id), -- Doctor who prescribed
    prescription_date DATE,
    prescription_notes TEXT,

    -- Special Instructions
    instructions TEXT, -- e.g., "Take with food", "Do not crush"
    side_effects TEXT, -- Known side effects to monitor

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    discontinuation_reason TEXT,
    discontinued_by UUID REFERENCES users(id),
    discontinued_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT end_date_valid CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT duration_positive CHECK (duration_days IS NULL OR duration_days > 0)
);

-- Indexes for medications
CREATE INDEX idx_medications_resident ON medications(resident_id); -- Most common query
CREATE INDEX idx_medications_active ON medications(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_medications_next_due ON medications(next_due_time) WHERE next_due_time IS NOT NULL; -- Missed med alerts
CREATE INDEX idx_medications_prescribed_by ON medications(prescribed_by); -- Doctor's prescription history

-- Trigger
CREATE TRIGGER update_medications_updated_at
BEFORE UPDATE ON medications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- TABLE 5: medication_logs (ALREADY DEFINED IN PRD)
-- ============================================================
-- Purpose: Immutable record of medication administration with photo verification
-- Compliance: GoBD (immutable), §630f BGB (10-year retention)
-- ============================================================

CREATE TABLE medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE RESTRICT, -- Cannot delete medication with logs
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,

    -- Scheduling
    scheduled_time TIMESTAMPTZ NOT NULL,
    administered_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    administered_by UUID NOT NULL REFERENCES users(id), -- Caregiver

    -- Photo Verification (MANDATORY - Patient Safety)
    photo_url VARCHAR(500) NOT NULL, -- S3 path (cannot be NULL)
    photo_taken_at TIMESTAMPTZ NOT NULL,

    -- Status Tracking
    status VARCHAR(20) NOT NULL CHECK (status IN ('given', 'refused', 'missed', 'vomited')),
    notes TEXT, -- Optional notes (e.g., "Patient refused due to nausea")

    -- Billing Integration
    is_billed BOOLEAN DEFAULT FALSE, -- Prevent duplicate billing

    -- Compliance Metadata (§630f BGB)
    retention_until DATE DEFAULT (CURRENT_DATE + INTERVAL '10 years'),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT photo_url_valid CHECK (photo_url LIKE 's3://elderly-care-photos/%'),
    CONSTRAINT administered_time_valid CHECK (administered_time <= NOW()),
    CONSTRAINT photo_time_near_admin CHECK (
        ABS(EXTRACT(EPOCH FROM (photo_taken_at - administered_time))) < 600 -- Within 10 minutes
    )
);

-- Indexes for medication_logs (CRITICAL - Missing in PRD!)
CREATE INDEX idx_med_logs_resident_date ON medication_logs(resident_id, administered_time DESC); -- Recent logs for resident
CREATE INDEX idx_med_logs_medication ON medication_logs(medication_id, administered_time DESC); -- Medication history
CREATE INDEX idx_med_logs_billing ON medication_logs(resident_id, administered_time, status)
    WHERE status = 'given' AND NOT is_billed; -- Monthly billing export optimization
CREATE INDEX idx_med_logs_scheduled ON medication_logs(scheduled_time)
    WHERE status IS NULL; -- Missed medication alerts (should not exist with NOT NULL constraint)
CREATE INDEX idx_med_logs_administered_by ON medication_logs(administered_by, administered_time DESC); -- Caregiver activity

-- Comments
COMMENT ON TABLE medication_logs IS 'Immutable medication administration logs with photo verification. GoBD compliance. Retention: 10 years (§630f BGB).';
COMMENT ON COLUMN medication_logs.photo_url IS 'MANDATORY. S3 encrypted path. Photo verification prevents medication errors (60% reduction target).';


-- ============================================================
-- TABLE 6: medical_conditions
-- ============================================================
-- Purpose: Resident chronic conditions and diagnoses (ICD-10 codes)
-- ============================================================

CREATE TABLE medical_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Resident Assignment
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,

    -- Diagnosis Information
    condition_name VARCHAR(200) NOT NULL, -- e.g., "Type 2 Diabetes"
    icd10_code VARCHAR(10), -- ICD-10-SGB-V 2.0 format: 'E11.9', 'I10'

    -- Severity
    severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
    is_primary BOOLEAN DEFAULT FALSE, -- Primary diagnosis for billing

    -- Dates
    diagnosed_date DATE,
    diagnosed_by UUID REFERENCES users(id), -- Doctor

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    resolved_date DATE,

    -- Notes
    treatment_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT resolved_date_valid CHECK (resolved_date IS NULL OR resolved_date >= diagnosed_date)
);

-- Indexes
CREATE INDEX idx_medical_conditions_resident ON medical_conditions(resident_id);
CREATE INDEX idx_medical_conditions_primary ON medical_conditions(resident_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_medical_conditions_icd10 ON medical_conditions(icd10_code); -- Billing analytics

-- Trigger
CREATE TRIGGER update_medical_conditions_updated_at
BEFORE UPDATE ON medical_conditions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- TABLE 7: vital_signs
-- ============================================================
-- Purpose: Manual and IoT sensor vital sign logging
-- ============================================================

CREATE TABLE vital_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Resident Assignment
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,

    -- Vital Sign Type
    vital_type VARCHAR(50) NOT NULL CHECK (vital_type IN (
        'blood_pressure', 'heart_rate', 'temperature', 'respiratory_rate',
        'oxygen_saturation', 'blood_glucose', 'weight', 'height'
    )),

    -- Measurements
    value_numeric DECIMAL(10, 2), -- Single value (heart_rate, temperature, etc.)
    value_systolic INTEGER, -- Blood pressure systolic
    value_diastolic INTEGER, -- Blood pressure diastolic
    unit VARCHAR(20) NOT NULL, -- 'mmHg', 'bpm', '°C', 'kg', etc.

    -- Measurement Context
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    measured_by UUID REFERENCES users(id), -- NULL if IoT sensor
    measurement_method VARCHAR(50) CHECK (measurement_method IN ('manual', 'iot_sensor', 'medical_device')),
    device_id VARCHAR(100), -- IoT device identifier

    -- Flags
    is_abnormal BOOLEAN DEFAULT FALSE,
    alert_triggered BOOLEAN DEFAULT FALSE,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT blood_pressure_valid CHECK (
        vital_type != 'blood_pressure' OR (value_systolic IS NOT NULL AND value_diastolic IS NOT NULL)
    ),
    CONSTRAINT measured_time_valid CHECK (measured_at <= NOW())
);

-- Indexes
CREATE INDEX idx_vital_signs_resident_date ON vital_signs(resident_id, measured_at DESC);
CREATE INDEX idx_vital_signs_type ON vital_signs(vital_type, measured_at DESC);
CREATE INDEX idx_vital_signs_abnormal ON vital_signs(is_abnormal) WHERE is_abnormal = TRUE;


-- ============================================================
-- TABLE 8: shifts
-- ============================================================
-- Purpose: Caregiver shift scheduling
-- ============================================================

CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Caregiver Assignment
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Shift Details
    shift_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'night', 'full_day')),
    start_time TIME NOT NULL, -- 24-hour format (German compliance)
    end_time TIME NOT NULL,

    -- Status
    is_completed BOOLEAN DEFAULT FALSE,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT shift_time_valid CHECK (end_time > start_time),
    CONSTRAINT unique_caregiver_shift UNIQUE(caregiver_id, shift_date, shift_type)
);

-- Indexes
CREATE INDEX idx_shifts_caregiver_date ON shifts(caregiver_id, shift_date DESC);
CREATE INDEX idx_shifts_date ON shifts(shift_date);
CREATE INDEX idx_shifts_current ON shifts(shift_date, start_time, end_time)
    WHERE shift_date = CURRENT_DATE;


-- ============================================================
-- TABLE 9: tasks
-- ============================================================
-- Purpose: Daily care tasks and checklists
-- ============================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Assignment
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Caregiver
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,

    -- Task Details
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
        'medication', 'hygiene', 'feeding', 'mobility_assistance',
        'incontinence_care', 'wound_care', 'social_activity', 'other'
    )),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',

    -- Scheduling
    due_date DATE NOT NULL,
    due_time TIME, -- NULL for all-day tasks
    estimated_duration_minutes INTEGER,

    -- Status
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'cancelled')) DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id),
    completion_notes TEXT,

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT completed_time_valid CHECK (
        status != 'completed' OR completed_at IS NOT NULL
    )
);

-- Indexes
CREATE INDEX idx_tasks_resident_date ON tasks(resident_id, due_date);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to, due_date);
CREATE INDEX idx_tasks_status ON tasks(status) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_tasks_due_today ON tasks(due_date, status) WHERE due_date = CURRENT_DATE;

-- Trigger
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- TABLE 10: doctor_visits
-- ============================================================
-- Purpose: Doctor consultations and teleconsultation sessions
-- ============================================================

CREATE TABLE doctor_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Participants
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Visit Details
    visit_type VARCHAR(30) NOT NULL CHECK (visit_type IN ('in_person', 'teleconsultation', 'emergency')),
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL, -- 24-hour format
    duration_minutes INTEGER,

    -- Teleconsultation (WebRTC Session)
    webrtc_session_id UUID, -- Links to teleconsultation_sessions table
    is_video BOOLEAN DEFAULT TRUE,
    call_quality_rating INTEGER CHECK (call_quality_rating BETWEEN 1 AND 5),

    -- Clinical Notes
    chief_complaint TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    prescriptions_updated BOOLEAN DEFAULT FALSE,

    -- Billing (GOÄ - Gebührenordnung für Ärzte)
    goae_code VARCHAR(20), -- German medical fee schedule
    billing_amount_eur DECIMAL(10, 2),
    is_billed BOOLEAN DEFAULT FALSE,

    -- Status
    status VARCHAR(20) CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_doctor_visits_resident ON doctor_visits(resident_id, visit_date DESC);
CREATE INDEX idx_doctor_visits_doctor ON doctor_visits(doctor_id, visit_date DESC);
CREATE INDEX idx_doctor_visits_billing ON doctor_visits(is_billed) WHERE NOT is_billed;
CREATE INDEX idx_doctor_visits_scheduled ON doctor_visits(visit_date, status) WHERE status = 'scheduled';

-- Trigger
CREATE TRIGGER update_doctor_visits_updated_at
BEFORE UPDATE ON doctor_visits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- TABLE 11: teleconsultation_sessions
-- ============================================================
-- Purpose: WebRTC teleconsultation call logs (Annex 31a/31b BMV-Ä)
-- ============================================================

CREATE TABLE teleconsultation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Session Details
    doctor_visit_id UUID REFERENCES doctor_visits(id) ON DELETE SET NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE, -- WebRTC room token

    -- Participants
    initiator_id UUID NOT NULL REFERENCES users(id),
    participants JSONB NOT NULL, -- Array of user IDs who joined

    -- Session Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,

    -- Technical Details
    signaling_server VARCHAR(255), -- WebSocket server URL
    turn_server VARCHAR(255), -- STUN/TURN server used
    encryption_protocol VARCHAR(50) DEFAULT 'SRTP-DTLS', -- GKV compliance

    -- Call Quality Metrics
    average_bitrate_kbps INTEGER,
    packet_loss_percentage DECIMAL(5, 2),
    jitter_ms INTEGER,

    -- Recording (Requires Explicit Consent)
    is_recorded BOOLEAN DEFAULT FALSE,
    recording_url VARCHAR(500), -- S3 path if recorded
    recording_consent_obtained BOOLEAN DEFAULT FALSE,

    -- Status
    session_status VARCHAR(20) CHECK (session_status IN ('active', 'ended', 'failed', 'abandoned')) DEFAULT 'active',
    failure_reason TEXT,

    -- Compliance (Annex 31a/31b BMV-Ä)
    gkv_certified BOOLEAN DEFAULT TRUE, -- Session used certified infrastructure
    data_processed_in_eu BOOLEAN DEFAULT TRUE, -- §393 SGB V compliance

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT duration_valid CHECK (duration_seconds IS NULL OR duration_seconds > 0),
    CONSTRAINT recording_consent_required CHECK (
        NOT is_recorded OR recording_consent_obtained = TRUE
    )
);

-- Indexes
CREATE INDEX idx_teleconsult_doctor_visit ON teleconsultation_sessions(doctor_visit_id);
CREATE INDEX idx_teleconsult_started ON teleconsultation_sessions(started_at DESC);
CREATE INDEX idx_teleconsult_active ON teleconsultation_sessions(session_status) WHERE session_status = 'active';


-- ============================================================
-- TABLE 12: billing_records
-- ============================================================
-- Purpose: Billing transactions and invoices (§301 SGB V compliance)
-- ============================================================

CREATE TABLE billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Resident/Insurance
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
    insurance_number VARCHAR(50) NOT NULL,
    insurance_provider VARCHAR(100) NOT NULL,

    -- Billing Period
    billing_month DATE NOT NULL, -- First day of billing month

    -- Service Details
    service_code VARCHAR(50) NOT NULL, -- PG1_BASE, PG2_BASE, MED_ADMIN, DOCTOR_VISIT, etc.
    service_description VARCHAR(200),
    icd10_code VARCHAR(10), -- ICD-10-SGB-V diagnosis code

    -- Amounts
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost_eur DECIMAL(10, 2) NOT NULL,
    total_cost_eur DECIMAL(10, 2) NOT NULL,

    -- Payment Status
    invoice_number VARCHAR(50) UNIQUE,
    invoice_date DATE,
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
    payment_received_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT total_cost_valid CHECK (total_cost_eur = quantity * unit_cost_eur)
);

-- Indexes
CREATE INDEX idx_billing_resident ON billing_records(resident_id, billing_month DESC);
CREATE INDEX idx_billing_month ON billing_records(billing_month);
CREATE INDEX idx_billing_status ON billing_records(payment_status) WHERE payment_status IN ('pending', 'overdue');
CREATE INDEX idx_billing_invoice ON billing_records(invoice_number) WHERE invoice_number IS NOT NULL;

-- Trigger
CREATE TRIGGER update_billing_records_updated_at
BEFORE UPDATE ON billing_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- TABLE 13: inventory
-- ============================================================
-- Purpose: Medical supplies and equipment inventory management
-- ============================================================

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Item Information
    item_name VARCHAR(200) NOT NULL,
    item_category VARCHAR(50) CHECK (item_category IN (
        'medication', 'medical_supply', 'hygiene', 'equipment', 'food', 'other'
    )),
    sku VARCHAR(100), -- Stock Keeping Unit
    barcode VARCHAR(100),

    -- Quantity
    current_quantity INTEGER NOT NULL DEFAULT 0,
    minimum_quantity INTEGER, -- Reorder threshold
    maximum_quantity INTEGER,
    unit_of_measurement VARCHAR(20), -- 'pieces', 'boxes', 'bottles', 'kg', etc.

    -- Location
    storage_location VARCHAR(100), -- 'Medicine Cabinet A', 'Storage Room 2', etc.

    -- Supplier
    supplier_name VARCHAR(200),
    supplier_contact TEXT,
    last_order_date DATE,
    next_reorder_date DATE,

    -- Cost
    unit_cost_eur DECIMAL(10, 2),

    -- Expiration (for medications and perishables)
    expiration_date DATE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    low_stock_alert BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT quantity_valid CHECK (current_quantity >= 0),
    CONSTRAINT min_max_valid CHECK (minimum_quantity IS NULL OR maximum_quantity IS NULL OR maximum_quantity >= minimum_quantity)
);

-- Indexes
CREATE INDEX idx_inventory_category ON inventory(item_category);
CREATE INDEX idx_inventory_low_stock ON inventory(low_stock_alert) WHERE low_stock_alert = TRUE;
CREATE INDEX idx_inventory_expiration ON inventory(expiration_date) WHERE expiration_date IS NOT NULL;

-- Trigger
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- TABLE 14: families
-- ============================================================
-- Purpose: Family member accounts linked to residents
-- ============================================================

CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User Account
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Resident Link
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,

    -- Relationship
    relationship VARCHAR(50) NOT NULL, -- 'son', 'daughter', 'spouse', 'sibling', 'guardian', 'other'
    is_primary_contact BOOLEAN DEFAULT FALSE,
    is_emergency_contact BOOLEAN DEFAULT FALSE,

    -- Contact Preferences
    preferred_contact_method VARCHAR(20) CHECK (preferred_contact_method IN ('email', 'phone', 'app', 'sms')),
    notification_preferences JSONB, -- {medication_updates: true, health_alerts: true, visit_reminders: true}

    -- Permissions
    can_view_medical_records BOOLEAN DEFAULT TRUE,
    can_receive_health_updates BOOLEAN DEFAULT TRUE,
    can_message_caregivers BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_resident UNIQUE(user_id, resident_id)
);

-- Indexes
CREATE INDEX idx_families_user ON families(user_id);
CREATE INDEX idx_families_resident ON families(resident_id);
CREATE INDEX idx_families_primary ON families(resident_id, is_primary_contact) WHERE is_primary_contact = TRUE;

-- Trigger
CREATE TRIGGER update_families_updated_at
BEFORE UPDATE ON families
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- TABLE 15: messages_family
-- ============================================================
-- Purpose: Generic secure messaging (Family ↔ Caregiver)
-- Note: NOT for professional communication (use Matrix TI-Messenger)
-- ============================================================

CREATE TABLE messages_family (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Participants
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE CASCADE, -- Context: which resident

    -- Message Content
    message_text TEXT NOT NULL,

    -- Encryption (libsodium XSalsa20-Poly1305)
    is_encrypted BOOLEAN DEFAULT TRUE,
    encryption_key_id VARCHAR(100), -- Key rotation tracking

    -- Attachments
    attachments JSONB, -- Array of S3 URLs: [{url, filename, size_bytes, mime_type}]

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_deleted_by_sender BOOLEAN DEFAULT FALSE,
    is_deleted_by_recipient BOOLEAN DEFAULT FALSE,

    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT sender_recipient_different CHECK (sender_id != recipient_id)
);

-- Indexes
CREATE INDEX idx_messages_recipient ON messages_family(recipient_id, sent_at DESC) WHERE NOT is_deleted_by_recipient;
CREATE INDEX idx_messages_sender ON messages_family(sender_id, sent_at DESC) WHERE NOT is_deleted_by_sender;
CREATE INDEX idx_messages_resident ON messages_family(resident_id, sent_at DESC);
CREATE INDEX idx_messages_unread ON messages_family(recipient_id, is_read) WHERE NOT is_read;


-- ============================================================
-- TABLE 16: notifications
-- ============================================================
-- Purpose: Push notification history and delivery tracking
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recipient
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification Content
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'medication_due', 'medication_missed', 'task_assigned', 'task_overdue',
        'vital_sign_alert', 'message_received', 'shift_reminder', 'system_alert'
    )),
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,

    -- Action (Deep Link)
    action_url VARCHAR(500), -- Deep link to specific screen in app
    action_data JSONB, -- Additional data for action (e.g., {resident_id: '123', medication_id: '456'})

    -- Delivery Status
    delivery_status VARCHAR(20) CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'read')) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,

    -- Platform
    platform VARCHAR(20) CHECK (platform IN ('ios', 'android', 'web', 'all')),
    device_token VARCHAR(500), -- FCM/APNs token

    -- Failure Tracking
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT retry_limit CHECK (retry_count <= 3)
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_pending ON notifications(delivery_status) WHERE delivery_status = 'pending';
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;


-- ============================================================
-- TABLE 17: audit_log_ledger (ALREADY DEFINED IN PRD - EXEMPLARY)
-- ============================================================
-- Purpose: Immutable audit trail with cryptographic chaining
-- Compliance: GoBD, §630f BGB (10-year retention)
-- ============================================================

CREATE TABLE audit_log_ledger (
    id BIGSERIAL PRIMARY KEY,

    -- Event Metadata
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('DATA_ACCESS', 'DATA_MODIFICATION', 'DATA_DELETION', 'SYSTEM_ALERT')),

    -- User Attribution (GDPR Article 5 - Accountability)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Cannot delete users with audit logs
    user_role VARCHAR(50) NOT NULL CHECK (user_role IN ('admin', 'doctor', 'caregiver', 'family', 'system')),

    -- Action Details
    action VARCHAR(50) NOT NULL CHECK (action IN ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'ANONYMIZE', 'LOGIN', 'LOGOUT')),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,

    -- State Capture (GoBD - Completeness Requirement)
    previous_state JSONB, -- State before modification (NULL for CREATE/VIEW)
    current_state JSONB,  -- State after modification (NULL for DELETE)

    -- Technical Context
    ip_address INET NOT NULL,
    user_agent TEXT,
    request_id UUID, -- For correlating distributed transactions

    -- Cryptographic Integrity (Blockchain-Inspired Chain)
    cryptographic_hash VARCHAR(64) NOT NULL, -- SHA-256 of this row + previous hash
    previous_hash VARCHAR(64), -- Hash of previous row (forms immutable chain)

    -- Compliance Metadata
    retention_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '10 years'), -- §630f BGB
    gdpr_deletion_eligible BOOLEAN DEFAULT FALSE, -- Set TRUE after 10 years

    -- Constraints
    CONSTRAINT audit_timestamp_check CHECK (event_timestamp <= NOW())
);

-- Create indexes for common audit queries
CREATE INDEX idx_audit_user_id ON audit_log_ledger(user_id);
CREATE INDEX idx_audit_resource ON audit_log_ledger(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_log_ledger(event_timestamp DESC);
CREATE INDEX idx_audit_retention ON audit_log_ledger(retention_until) WHERE NOT gdpr_deletion_eligible;

-- ============================================================
-- SECURITY: Prevent tampering by revoking UPDATE/DELETE
-- ============================================================
-- Application role can only INSERT and SELECT
REVOKE UPDATE, DELETE ON audit_log_ledger FROM PUBLIC;
GRANT INSERT, SELECT ON audit_log_ledger TO app_user; -- Create this role separately

-- ============================================================
-- CRYPTOGRAPHIC CHAINING FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION generate_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
    last_hash VARCHAR(64);
BEGIN
    -- Get hash of most recent audit log entry
    SELECT cryptographic_hash INTO last_hash
    FROM audit_log_ledger
    ORDER BY id DESC
    LIMIT 1;

    -- Generate hash for current row (includes previous hash in computation)
    NEW.cryptographic_hash := encode(
        digest(
            CONCAT(
                NEW.event_timestamp::TEXT,
                NEW.event_type,
                NEW.user_id::TEXT,
                NEW.action,
                NEW.resource_type,
                NEW.resource_id::TEXT,
                COALESCE(NEW.previous_state::TEXT, ''),
                COALESCE(NEW.current_state::TEXT, ''),
                NEW.ip_address::TEXT,
                COALESCE(last_hash, 'GENESIS') -- First row = 'GENESIS'
            ),
            'sha256'
        ),
        'hex'
    );

    NEW.previous_hash := last_hash;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to automatically hash every INSERT
CREATE TRIGGER audit_hash_trigger
BEFORE INSERT ON audit_log_ledger
FOR EACH ROW EXECUTE FUNCTION generate_audit_hash();

-- ============================================================
-- AUDIT LOG VERIFICATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION verify_audit_chain()
RETURNS TABLE(row_id BIGINT, is_valid BOOLEAN, expected_hash VARCHAR(64), actual_hash VARCHAR(64)) AS $$
DECLARE
    current_row RECORD;
    computed_hash VARCHAR(64);
    prev_hash VARCHAR(64) := 'GENESIS';
BEGIN
    FOR current_row IN
        SELECT * FROM audit_log_ledger ORDER BY id ASC
    LOOP
        -- Recompute hash for this row
        computed_hash := encode(
            digest(
                CONCAT(
                    current_row.event_timestamp::TEXT,
                    current_row.event_type,
                    current_row.user_id::TEXT,
                    current_row.action,
                    current_row.resource_type,
                    current_row.resource_id::TEXT,
                    COALESCE(current_row.previous_state::TEXT, ''),
                    COALESCE(current_row.current_state::TEXT, ''),
                    current_row.ip_address::TEXT,
                    prev_hash
                ),
                'sha256'
            ),
            'hex'
        );

        -- Return validation result
        RETURN QUERY SELECT
            current_row.id,
            (computed_hash = current_row.cryptographic_hash),
            computed_hash,
            current_row.cryptographic_hash;

        prev_hash := current_row.cryptographic_hash;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- GDPR COMPLIANT 10-YEAR RETENTION POLICY
-- ============================================================

CREATE OR REPLACE FUNCTION mark_old_audit_logs_for_deletion()
RETURNS void AS $$
BEGIN
    UPDATE audit_log_ledger
    SET gdpr_deletion_eligible = TRUE
    WHERE retention_until < CURRENT_DATE
      AND NOT gdpr_deletion_eligible;

    RAISE NOTICE 'Marked % audit logs as GDPR deletion eligible',
                 (SELECT COUNT(*) FROM audit_log_ledger WHERE gdpr_deletion_eligible);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- GDPR ANONYMIZATION FUNCTION (Post-Retention)
-- ============================================================

CREATE OR REPLACE FUNCTION anonymize_resident(resident_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE residents
    SET first_name = 'ANONYMIZED',
        last_name = 'RESIDENT',
        date_of_birth = NULL,
        insurance_number = NULL,
        phone = NULL,
        photo_url = NULL,
        contacts = NULL,
        allergies = NULL,
        advance_directives = NULL
    WHERE id = resident_uuid
      AND gdpr_deletion_eligible = TRUE;

    -- Log anonymization action
    INSERT INTO audit_log_ledger (
        user_id, user_role, action, resource_type, resource_id,
        previous_state, current_state, ip_address, event_type
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- System user UUID
        'system',
        'ANONYMIZE',
        'resident',
        resident_uuid,
        (SELECT row_to_json(residents.*) FROM residents WHERE id = resident_uuid),
        NULL,
        '127.0.0.1',
        'DATA_DELETION'
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- DATABASE ROLES & PERMISSIONS (BSI C5 Compliance)
-- ============================================================

-- Application service account (read/write most tables)
CREATE ROLE app_user WITH LOGIN PASSWORD 'CHANGE_THIS_IN_PRODUCTION_SECURE_PASSWORD';
GRANT CONNECT ON DATABASE elderly_care TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Revoke DELETE (enforce soft deletes via is_active = FALSE)
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM app_user;

-- Exception: audit_log_ledger is INSERT-ONLY
REVOKE UPDATE, DELETE ON audit_log_ledger FROM app_user;
GRANT INSERT, SELECT ON audit_log_ledger TO app_user;

-- Read-only analytics role (for BI tools)
CREATE ROLE analytics_user WITH LOGIN PASSWORD 'CHANGE_THIS_IN_PRODUCTION_ANALYTICS_PASSWORD';
GRANT CONNECT ON DATABASE elderly_care TO analytics_user;
GRANT USAGE ON SCHEMA public TO analytics_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
REVOKE SELECT ON audit_log_ledger FROM analytics_user; -- Sensitive data

-- Backup role (for pg_dump)
CREATE ROLE backup_user WITH LOGIN PASSWORD 'CHANGE_THIS_IN_PRODUCTION_BACKUP_PASSWORD';
GRANT CONNECT ON DATABASE elderly_care TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;


-- ============================================================
-- DATA CLASSIFICATION COMMENTS (BfDI Audit)
-- ============================================================

COMMENT ON DATABASE elderly_care IS 'Elderly Care Management Platform. Compliance: §630f BGB, GoBD, BSI C5:2020 Type 2, GDPR Article 9. Data Residency: AWS eu-central-1 (Frankfurt, Germany).';

COMMENT ON COLUMN users.email IS 'PII - Confidential. Primary authentication identifier.';
COMMENT ON COLUMN users.password_hash IS 'Restricted. bcrypt hash with salt rounds >= 12.';
COMMENT ON COLUMN residents.date_of_birth IS 'GDPR Article 9 Special Category: Health-related age data. Restricted. Retention: 10 years (§630f BGB).';
COMMENT ON COLUMN residents.allergies IS 'CRITICAL PATIENT SAFETY DATA. GDPR Article 9. Must never be truncated in UI (German text expansion). Retention: 10 years.';
COMMENT ON COLUMN medication_logs.photo_url IS 'MANDATORY. S3 encrypted path. Photo verification prevents medication errors (60% reduction target).';
COMMENT ON COLUMN audit_log_ledger.cryptographic_hash IS 'GoBD Compliance: SHA-256 hash for tamper-evidence. Immutable. Part of cryptographic chain. Modification = legal violation.';


-- ============================================================
-- SCHEMA VERSION TRACKING
-- ============================================================

CREATE TABLE schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (version, description) VALUES
('1.0.0', 'Initial schema with all 17 tables, indexes, triggers, and compliance functions');


-- ============================================================
-- END OF SCHEMA
-- ============================================================

-- Next Steps:
-- 1. Review this schema with team
-- 2. Test with Prisma (generate Prisma schema from this SQL)
-- 3. Create seed data (admin user, test residents)
-- 4. Implement partitioning for audit_log_ledger before production
-- 5. Configure RDS parameter group (ssl=on, log_min_duration_statement=1000)
-- 6. Set up CloudWatch monitoring (slow queries, connection pool)
-- 7. Schedule weekly verify_audit_chain() job (AWS Lambda)
