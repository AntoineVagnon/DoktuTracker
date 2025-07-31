-- Create health profiles table
CREATE TABLE IF NOT EXISTS health_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id integer NOT NULL REFERENCES users(id) UNIQUE,
    date_of_birth date,
    gender varchar,
    height varchar,
    weight varchar,
    blood_type varchar,
    allergies text[],
    medications text[],
    medical_history text[],
    emergency_contact_name varchar,
    emergency_contact_phone varchar,
    profile_status varchar NOT NULL DEFAULT 'incomplete',
    completion_score integer DEFAULT 0,
    last_reviewed_at timestamp,
    needs_review_after timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Create document uploads table
CREATE TABLE IF NOT EXISTS document_uploads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id integer NOT NULL REFERENCES appointments(id),
    uploaded_by integer NOT NULL REFERENCES users(id),
    file_name varchar NOT NULL,
    file_size integer NOT NULL,
    file_type varchar NOT NULL,
    upload_url text NOT NULL,
    document_type varchar,
    uploaded_at timestamp DEFAULT now()
);

-- Create banner dismissals table
CREATE TABLE IF NOT EXISTS banner_dismissals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id integer NOT NULL REFERENCES users(id),
    banner_type varchar NOT NULL,
    dismissed_at timestamp DEFAULT now(),
    expires_at timestamp
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_health_profiles_patient_id ON health_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_appointment_id ON document_uploads(appointment_id);
CREATE INDEX IF NOT EXISTS idx_banner_dismissals_user_id ON banner_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_banner_dismissals_type ON banner_dismissals(banner_type);