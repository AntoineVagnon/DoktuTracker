# Product Requirements Document: European Medical Compliance for Doktu Platform

## Executive Summary

This PRD outlines the critical compliance requirements to make the Doktu telemedicine platform compliant with European Union medical regulations. Based on analysis of the current platform and EU regulatory framework, immediate action is required to address significant compliance gaps, particularly around GDPR Article 9 (health data protection), missing legal documentation, and potential Medical Device Regulation (MDR) requirements.

## Current Platform Analysis

### Existing Technology Stack

- **Backend:** Supabase (database and authentication)

- **Video Conferencing:** Zoom integration

- **Frontend:** Web-based platform

- **Geographic Coverage:** Europe-wide service

### Critical Compliance Issues Identified

1. **Missing Privacy Policy** - The privacy policy link ([https://doktu.co/privacy](https://doktu.co/privacy)) returns 404 error

1. **Incomplete Legal Framework** - Terms of Service and GDPR Compliance pages may be non-functional

1. **GDPR Article 9 Non-Compliance** - No clear legal basis for processing health data

1. **Pricing Inconsistencies** - Main page shows €35, doctor profiles show €3.00

1. **Unclear Medical Device Status** - Platform may qualify as Medical Device Software (MDSW)

## Regulatory Compliance Requirements

### 1. GDPR Article 9 - Health Data Protection

#### Legal Basis Implementation

The platform must establish a clear legal basis for processing health data under GDPR Article 9(2):

**Primary Legal Basis:** Article 9(2)(h) - Healthcare Provision

- Processing necessary for medical diagnosis and provision of healthcare

- Must be based on contract with health professional

- Subject to professional secrecy obligations

**Secondary Legal Basis:** Article 9(2)(a) - Explicit Consent

- Backup legal basis for additional data processing

- Must be freely given, specific, informed, and unambiguous

### 2. Professional Qualification Requirements

#### Doctor Verification System

- All doctors must have EU-recognized qualifications per Directive 2005/36/EC

- Professional registration verification in home Member State

- Professional indemnity insurance coverage

- Continuing professional development compliance

### 3. Cross-Border Healthcare Compliance

#### Service Delivery Rules

- **B2B Services (Doctor-to-Doctor):** Country of origin principle applies

- **B2C Services (Doctor-to-Patient):** May need to comply with patient's country rules

- **Professional Qualifications:** Must be recognized in service delivery country

## Technical Implementation Requirements

### Phase 1: Critical Compliance Fixes (Immediate - Week 1)

#### 1.1 Legal Documentation System

**Requirement:** Create comprehensive legal documentation management system

**Implementation:**

```markdown
## Database Schema Updates (Supabase)

### New Tables:
1. `legal_documents`
   - id (uuid, primary key)
   - document_type (enum: 'privacy_policy', 'terms_of_service', 'gdpr_compliance', 'medical_disclaimer', 'cookie_policy')
   - version (varchar)
   - content (text)
   - effective_date (timestamp)
   - created_at (timestamp)
   - updated_at (timestamp)
   - is_active (boolean)

2. `user_consents`
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - consent_type (enum: 'health_data_processing', 'marketing', 'cookies', 'data_sharing')
   - legal_basis (enum: 'article_9_2_h', 'article_9_2_a', 'article_6_1_a', 'article_6_1_b')
   - consent_given (boolean)
   - consent_date (timestamp)
   - consent_withdrawn_date (timestamp, nullable)
   - document_version (varchar)
   - ip_address (varchar)
   - user_agent (text)

3. `gdpr_data_processing_records`
   - id (uuid, primary key)
   - user_id (uuid, foreign key)
   - processing_purpose (varchar)
   - legal_basis (varchar)
   - data_categories (jsonb)
   - retention_period (varchar)
   - created_at (timestamp)
```

#### 1.2 Privacy Policy Implementation

**Requirement:** Create comprehensive GDPR-compliant privacy policy

**File Location:** `/legal/privacy-policy.md`

**Content:**

---

# PRIVACY POLICY TEXT (To be implemented at /privacy route)

```markdown
# Privacy Policy - Doktu Telemedicine Platform

**Effective Date:** [Current Date]  
**Last Updated:** [Current Date]  
**Version:** 1.0

## 1. Controller Information

**Data Controller:** Doktu SAS  
**Address:** [Company Address]  
**Email:** privacy@doktu.co  
**Phone:** +33 1 23 45 67 89  
**Data Protection Officer:** dpo@doktu.co

## 2. Legal Basis for Processing Health Data

Under the General Data Protection Regulation (GDPR) Article 9, we process your health data based on the following legal grounds:

### Primary Legal Basis: Article 9(2)(h) - Healthcare Provision
We process your health data as it is necessary for:
- Medical diagnosis and assessment
- Provision of healthcare and medical treatment
- Management of healthcare services
- Communication with healthcare professionals

This processing is conducted under contract with licensed healthcare professionals who are subject to professional secrecy obligations under EU and Member State law.

### Secondary Legal Basis: Article 9(2)(a) - Explicit Consent
Where required, we obtain your explicit consent for processing health data for specific purposes including:
- Storing consultation history for continuity of care
- Sharing data with specialists for referrals
- Using anonymized data for service improvement

## 3. Data We Collect

### 3.1 Health Data (Special Category Data)
- Medical history and symptoms
- Consultation notes and diagnoses
- Prescription information
- Treatment recommendations
- Vital signs and measurements
- Medical images or documents you provide

### 3.2 Personal Data
- Name, date of birth, gender
- Contact information (email, phone, address)
- Payment information
- Account credentials
- Communication records
- Technical data (IP address, browser information)

### 3.3 Video Consultation Data
- Video and audio recordings (if consented)
- Chat messages during consultations
- Screen sharing content
- Technical metadata from Zoom integration

## 4. How We Use Your Data

### 4.1 Healthcare Purposes (Article 9(2)(h))
- Facilitating video consultations with doctors
- Maintaining medical records for continuity of care
- Enabling prescription management
- Supporting follow-up care
- Emergency medical situations

### 4.2 Service Management (Article 6(1)(b))
- Account management and authentication
- Payment processing
- Customer support
- Service improvement and optimization

### 4.3 Legal Compliance (Article 6(1)(c))
- Regulatory reporting requirements
- Professional licensing compliance
- Tax and accounting obligations
- Law enforcement requests

## 5. Data Sharing and Recipients

### 5.1 Healthcare Professionals
Your health data is shared with:
- The doctor(s) you consult with
- Specialist doctors for referrals (with your consent)
- Emergency services (in life-threatening situations)

### 5.2 Service Providers
We share limited data with:
- **Supabase:** Database hosting and management (EU-based servers)
- **Zoom:** Video consultation services (GDPR-compliant configuration)
- **Payment processors:** For transaction processing
- **Cloud storage providers:** For secure data backup (EU-based)

### 5.3 Legal Requirements
We may disclose data when required by:
- Court orders or legal proceedings
- Regulatory authorities
- Law enforcement agencies
- Public health authorities

## 6. International Data Transfers

All health data is processed and stored within the European Union. Any transfers outside the EU are conducted under appropriate safeguards:
- Adequacy decisions by the European Commission
- Standard Contractual Clauses (SCCs)
- Binding Corporate Rules (BCRs)

## 7. Data Retention

### 7.1 Health Data
- **Active medical records:** Retained for 10 years after last consultation
- **Consultation recordings:** Deleted after 30 days unless consent given for longer retention
- **Prescription data:** Retained as required by national pharmacy regulations

### 7.2 Personal Data
- **Account data:** Retained while account is active plus 3 years
- **Payment data:** Retained for 7 years for tax compliance
- **Marketing data:** Retained until consent is withdrawn

## 8. Your Rights Under GDPR

### 8.1 Access Rights (Article 15)
You have the right to obtain confirmation of data processing and access to your personal data.

### 8.2 Rectification Rights (Article 16)
You can request correction of inaccurate or incomplete personal data.

### 8.3 Erasure Rights (Article 17)
You can request deletion of your data, subject to legal retention requirements.

### 8.4 Restriction Rights (Article 18)
You can request restriction of processing in certain circumstances.

### 8.5 Portability Rights (Article 20)
You can request transfer of your data to another healthcare provider.

### 8.6 Objection Rights (Article 21)
You can object to processing based on legitimate interests.

### 8.7 Consent Withdrawal
You can withdraw consent at any time for processing based on consent.

## 9. Security Measures

We implement appropriate technical and organizational measures:
- End-to-end encryption for video consultations
- AES-256 encryption for data at rest
- Multi-factor authentication for healthcare professionals
- Regular security audits and penetration testing
- Staff training on data protection
- Incident response procedures

## 10. Data Breach Notification

In case of a data breach affecting your rights and freedoms:
- We will notify the supervisory authority within 72 hours
- We will inform you without undue delay if high risk is involved
- We will document all breaches and remedial actions taken

## 11. Supervisory Authority

You have the right to lodge a complaint with your national data protection authority:
- **France:** Commission Nationale de l'Informatique et des Libertés (CNIL)
- **Germany:** Federal Commissioner for Data Protection and Freedom of Information
- **Other EU countries:** Your national data protection authority

## 12. Contact Information

For any privacy-related questions or to exercise your rights:
- **Email:** privacy@doktu.co
- **Data Protection Officer:** dpo@doktu.co
- **Address:** [Company Address]
- **Phone:** +33 1 23 45 67 89

## 13. Changes to This Policy

We may update this privacy policy to reflect changes in our practices or legal requirements. We will:
- Notify you of material changes via email
- Post updates on our website
- Maintain previous versions for reference

---
*This privacy policy complies with GDPR, ePrivacy Directive, and applicable national healthcare data protection laws.*
```

---

#### 1.3 Terms of Service Implementation

**Requirement:** Create comprehensive terms of service for telemedicine platform

**File Location:** `/legal/terms-of-service.md`

**Content:**

```markdown
# Terms of Service - Doktu Telemedicine Platform

**Effective Date:** [Current Date]  
**Last Updated:** [Current Date]  
**Version:** 1.0

## 1. Service Provider Information

**Company:** Doktu SAS  
**Registration:** [EU Company Registration Number]  
**Address:** [Company Address]  
**Email:** legal@doktu.co  
**Phone:** +33 1 23 45 67 89

## 2. Service Description

Doktu provides a telemedicine platform connecting patients with licensed healthcare professionals for remote medical consultations via secure video conferencing technology.

### 2.1 Services Included
- Video consultations with verified healthcare professionals
- Secure messaging with healthcare providers
- Digital prescription services (where legally permitted)
- Medical record storage and management
- Appointment scheduling and management

### 2.2 Services Not Included
- Emergency medical services
- In-person medical examinations
- Surgical procedures
- Prescription of controlled substances (where prohibited)
- Mental health crisis intervention

## 3. Eligibility and Registration

### 3.1 Patient Eligibility
- Must be 18 years or older (or have parental consent)
- Must be located in a jurisdiction where telemedicine is legally permitted
- Must provide accurate and complete registration information
- Must have stable internet connection for video consultations

### 3.2 Healthcare Professional Requirements
- Must hold valid medical license in EU Member State
- Must maintain professional indemnity insurance
- Must comply with professional medical standards
- Must complete platform training and certification

## 4. Medical Disclaimer and Limitations

### 4.1 Not Emergency Services
This platform is NOT intended for medical emergencies. For life-threatening conditions, contact emergency services immediately (112 in EU).

### 4.2 Diagnostic Limitations
- Remote consultations have inherent limitations
- Physical examination cannot be performed
- Some conditions require in-person evaluation
- Healthcare professionals may recommend in-person follow-up

### 4.3 Prescription Limitations
- Prescriptions subject to national and EU regulations
- Controlled substances may not be prescribed remotely
- Some medications require in-person consultation
- Prescription validity subject to local pharmacy regulations

## 5. User Responsibilities

### 5.1 Patient Responsibilities
- Provide accurate and complete medical information
- Follow healthcare professional recommendations
- Maintain confidentiality of account credentials
- Report technical issues promptly
- Comply with applicable laws and regulations

### 5.2 Healthcare Professional Responsibilities
- Maintain professional medical standards
- Comply with medical licensing requirements
- Protect patient confidentiality
- Provide appropriate medical care within scope of practice
- Document consultations appropriately

## 6. Payment Terms

### 6.1 Pricing
- Pay-per-consultation: €35 per 30-minute consultation
- Monthly plans available with specified consultation limits
- Prices include VAT where applicable

### 6.2 Payment Processing
- Payments processed securely through authorized payment providers
- Refunds subject to consultation completion and satisfaction policies
- Failed payments may result in service suspension

## 7. Privacy and Data Protection

### 7.1 GDPR Compliance
- All data processing complies with GDPR requirements
- Health data processed under Article 9(2)(h) legal basis
- Detailed privacy policy available at /privacy

### 7.2 Professional Secrecy
- Healthcare professionals bound by professional secrecy obligations
- Patient data shared only as necessary for medical care
- Third-party access limited to essential service providers

## 8. Intellectual Property

### 8.1 Platform Rights
- Doktu retains all rights to platform technology and content
- Users granted limited license to use platform for intended purposes
- Unauthorized copying or distribution prohibited

### 8.2 User Content
- Patients retain rights to their medical information
- Platform granted license to process data for service provision
- Medical records remain property of patients

## 9. Service Availability and Technical Requirements

### 9.1 Service Availability
- Platform available 24/7 with scheduled maintenance windows
- Healthcare professional availability varies by specialty and time
- No guarantee of immediate consultation availability

### 9.2 Technical Requirements
- Compatible web browser with video/audio capabilities
- Stable internet connection (minimum 1 Mbps upload/download)
- Camera and microphone for video consultations
- Updated browser security settings

## 10. Limitation of Liability

### 10.1 Platform Liability
- Doktu provides technology platform only
- Medical care provided by independent healthcare professionals
- Liability limited to platform service failures
- No liability for medical outcomes or professional negligence

### 10.2 Healthcare Professional Liability
- Healthcare professionals maintain independent professional liability
- Professional indemnity insurance required for all providers
- Medical malpractice claims directed to individual professionals

## 11. Termination

### 11.1 User Termination
- Users may terminate accounts at any time
- Medical records retained per legal requirements
- Outstanding payments remain due

### 11.2 Platform Termination
- Platform may terminate accounts for terms violations
- Healthcare professionals may be removed for professional misconduct
- Reasonable notice provided except for serious violations

## 12. Dispute Resolution

### 12.1 Governing Law
- Terms governed by laws of [EU Member State of incorporation]
- EU consumer protection laws apply where applicable
- Healthcare professional disputes subject to professional regulations

### 12.2 Dispute Resolution Process
1. Direct negotiation with customer service
2. Mediation through approved EU mediation service
3. Arbitration or court proceedings as legally required

## 13. Regulatory Compliance

### 13.1 Medical Device Regulation
- Platform assessed for Medical Device Regulation compliance
- Software classification updated as regulations evolve
- CE marking applied if required

### 13.2 Cross-Border Healthcare
- Services comply with EU cross-border healthcare directives
- Professional qualifications recognized per EU regulations
- Patient rights protected across Member States

## 14. Updates and Modifications

### 14.1 Terms Updates
- Terms may be updated to reflect legal or service changes
- Users notified of material changes via email
- Continued use constitutes acceptance of updated terms

### 14.2 Service Changes
- Platform features may be added, modified, or discontinued
- Reasonable notice provided for significant changes
- Essential medical services maintained during transitions

## 15. Contact Information

For questions about these terms:
- **Email:** legal@doktu.co
- **Customer Service:** support@doktu.co
- **Address:** [Company Address]
- **Phone:** +33 1 23 45 67 89

---
*These terms comply with EU consumer protection laws, medical device regulations, and cross-border healthcare directives.*
```

---

#### 1.4 GDPR Compliance Page Implementation

**Requirement:** Create detailed GDPR compliance documentation

**File Location:** `/legal/gdpr-compliance.md`

**Content:**

```markdown
# GDPR Compliance - Doktu Platform

**Last Updated:** [Current Date]  
**Compliance Officer:** [Name]  
**Contact:** gdpr@doktu.co

## Our Commitment to GDPR Compliance

Doktu is fully committed to protecting your personal data and complying with the General Data Protection Regulation (GDPR). This page outlines our comprehensive approach to data protection.

## Legal Basis for Health Data Processing

### Article 9(2)(h) - Healthcare Provision
We process your health data as it is necessary for the provision of healthcare services, medical diagnosis, and treatment management. This processing is conducted by or under the responsibility of healthcare professionals subject to professional secrecy obligations.

### Article 9(2)(a) - Explicit Consent
Where additional processing is required beyond direct healthcare provision, we obtain your explicit, informed consent.

## Data Protection Principles

We adhere to all GDPR principles:
- **Lawfulness, fairness, and transparency**
- **Purpose limitation**
- **Data minimization**
- **Accuracy**
- **Storage limitation**
- **Integrity and confidentiality**
- **Accountability**

## Your GDPR Rights

### Right of Access (Article 15)
Request access to your personal data and information about how we process it.

### Right to Rectification (Article 16)
Request correction of inaccurate or incomplete personal data.

### Right to Erasure (Article 17)
Request deletion of your personal data, subject to legal retention requirements.

### Right to Restrict Processing (Article 18)
Request restriction of processing in certain circumstances.

### Right to Data Portability (Article 20)
Request transfer of your data in a structured, commonly used format.

### Right to Object (Article 21)
Object to processing based on legitimate interests.

### Rights Related to Automated Decision Making (Article 22)
Protection against solely automated decision-making with legal effects.

## Data Protection Measures

### Technical Measures
- End-to-end encryption for all communications
- AES-256 encryption for data at rest
- Multi-factor authentication
- Regular security audits
- Automated backup systems with encryption

### Organizational Measures
- Data Protection Officer appointment
- Staff training on GDPR compliance
- Data processing impact assessments
- Incident response procedures
- Vendor due diligence processes

## International Data Transfers

All health data is processed within the EU. Any transfers outside the EU are protected by:
- European Commission adequacy decisions
- Standard Contractual Clauses
- Binding Corporate Rules
- Appropriate safeguards as required by GDPR

## Data Breach Response

In case of a personal data breach:
- Supervisory authority notification within 72 hours
- Individual notification without undue delay if high risk
- Comprehensive breach documentation
- Remedial action implementation

## Contact Information

**Data Protection Officer:** dpo@doktu.co  
**GDPR Inquiries:** gdpr@doktu.co  
**General Privacy Questions:** privacy@doktu.co

## Supervisory Authority

You have the right to lodge a complaint with your national data protection authority. Contact details available at: https://edpb.europa.eu/about-edpb/board/members_en
```

---

### Phase 2: Consent Management System

#### 2.1 Consent Management Interface

**Requirement:** Implement comprehensive consent management system

**Frontend Components:**

```typescript
// ConsentManager.tsx
interface ConsentType {
  id: string;
  type: 'health_data_processing' | 'marketing' | 'cookies' | 'data_sharing';
  title: string;
  description: string;
  legalBasis: 'article_9_2_h' | 'article_9_2_a' | 'article_6_1_a' | 'article_6_1_b';
  required: boolean;
  granular: boolean;
  purposes: string[];
}

interface ConsentManagerProps {
  userId: string;
  onConsentUpdate: (consents: ConsentRecord[]) => void;
}

// Key features to implement:
// - Granular consent options for different data processing purposes
// - Clear explanation of legal basis for each consent type
// - Withdrawal mechanism for all consent-based processing
// - Consent history tracking and audit trail
// - Integration with Supabase for consent storage
```

#### 2.2 Health Data Processing Consent

**Requirement:** Specific consent flow for health data processing

**Implementation Details:**

```markdown
### Consent Flow Steps:
1. **Initial Registration Consent**
   - Article 9(2)(h) basis explanation
   - Essential health data processing for medical care
   - Cannot be withdrawn while using service

2. **Enhanced Data Processing Consent**
   - Article 9(2)(a) basis for additional purposes
   - Optional features requiring explicit consent
   - Can be withdrawn without affecting core service

3. **Consultation-Specific Consent**
   - Recording consent for video consultations
   - Data sharing with specialists
   - Research participation (anonymized data)

### Technical Implementation:
- Modal dialogs with clear consent language
- Checkbox interfaces with individual consent tracking
- Timestamp and IP address logging for consent records
- Integration with user profile for consent management
```

#### 2.3 Cookie Consent System

**Requirement:** GDPR-compliant cookie consent management

**Implementation:**

```javascript
// Cookie consent categories:
const cookieCategories = {
  essential: {
    name: 'Essential Cookies',
    description: 'Required for platform functionality',
    required: true,
    cookies: ['session', 'authentication', 'security']
  },
  functional: {
    name: 'Functional Cookies',
    description: 'Enhance user experience',
    required: false,
    cookies: ['preferences', 'language', 'accessibility']
  },
  analytics: {
    name: 'Analytics Cookies',
    description: 'Help us improve our service',
    required: false,
    cookies: ['google_analytics', 'performance_monitoring']
  },
  marketing: {
    name: 'Marketing Cookies',
    description: 'Personalized content and ads',
    required: false,
    cookies: ['advertising', 'social_media', 'tracking']
  }
};
```

### Phase 3: Data Processing Records System (Week 2-3)

#### 3.1 Data Processing Impact Assessment (DPIA)

**Requirement:** Implement DPIA tracking for high-risk processing

**Database Schema:**

```sql
CREATE TABLE data_processing_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_name VARCHAR NOT NULL,
  description TEXT,
  legal_basis VARCHAR NOT NULL,
  data_categories JSONB,
  processing_purposes JSONB,
  recipients JSONB,
  retention_period VARCHAR,
  security_measures JSONB,
  risk_level ENUM('low', 'medium', 'high'),
  mitigation_measures JSONB,
  review_date DATE,
  approved_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2 Processing Activity Records

**Requirement:** Maintain comprehensive processing activity records per GDPR Article 30

**Implementation:**

```typescript
interface ProcessingActivity {
  id: string;
  name: string;
  purposes: string[];
  dataSubjectCategories: string[];
  personalDataCategories: string[];
  recipients: string[];
  thirdCountryTransfers: boolean;
  safeguards: string[];
  retentionPeriods: Record<string, string>;
  securityMeasures: string[];
  lastReviewed: Date;
}

// Key processing activities to document:
// - Patient registration and account management
// - Video consultation facilitation
// - Medical record storage and management
// - Prescription processing and management
// - Payment processing
// - Customer support interactions
// - Marketing communications (with consent)
```

### Phase 4: Medical Device Compliance Assessment

#### 4.1 MDCG 2019-11 Decision Tree Implementation

**Requirement:** Assess platform against Medical Device Software criteria

**Assessment Questions:**

```markdown
### Step 1: Is it software?
✅ YES - Doktu platform is software that processes input data and creates output data

### Step 2: Is the software an accessory?
❓ ASSESS - Determine if platform drives or influences use of hardware medical devices

### Step 3: Does the software process data?
✅ YES - Platform processes patient health data beyond simple storage/communication

### Step 4: Is the action for the benefit of individual patients?
✅ YES - Data processing directly benefits individual patients receiving care

### Step 5: Is the software MDSW according to guidance?
❓ REQUIRES ASSESSMENT - Need detailed analysis of specific platform functions
```

#### 4.2 Medical Device Classification

**Requirement:** If classified as medical device, implement appropriate controls

**Potential Classification Scenarios:**

```markdown
### Scenario A: Not a Medical Device
- Platform only facilitates communication
- No diagnostic or treatment algorithms
- No data processing affecting medical decisions
- **Action Required:** Document assessment rationale

### Scenario B: Class I Medical Device
- Basic medical device software functionality
- Low risk to patients
- **Requirements:** CE marking, technical documentation, post-market surveillance

### Scenario C: Class IIa Medical Device
- Medium risk medical device software
- Diagnostic support features
- **Requirements:** Notified body assessment, clinical evaluation, risk management
```

### Phase 5: Professional Qualification Verification

#### 5.1 Doctor Verification System Enhancement

**Requirement:** Implement comprehensive professional qualification verification

**Database Schema Updates:**

```sql
CREATE TABLE doctor_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id),
  qualification_type ENUM('medical_degree', 'specialty_certification', 'license'),
  issuing_authority VARCHAR NOT NULL,
  qualification_number VARCHAR NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  verification_status ENUM('pending', 'verified', 'expired', 'revoked'),
  verification_date DATE,
  verification_method VARCHAR,
  supporting_documents JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE professional_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id),
  insurance_provider VARCHAR NOT NULL,
  policy_number VARCHAR NOT NULL,
  coverage_amount DECIMAL,
  coverage_territory VARCHAR NOT NULL,
  effective_date DATE,
  expiry_date DATE,
  verification_status ENUM('pending', 'verified', 'expired'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5.2 Cross-Border Practice Compliance

**Requirement:** Ensure doctors can legally practice across EU borders

**Implementation Features:**

```markdown
### Professional Qualification Recognition
- Automatic verification against EU qualification databases
- Integration with national medical licensing authorities
- Real-time license status checking
- Specialty recognition validation

### Temporary Service Provision
- Declaration requirements for temporary cross-border services
- Notification to host Member State authorities
- Professional indemnity insurance verification
- Language competency requirements

### Permanent Establishment
- Full registration requirements in host Member State
- Adaptation period or aptitude test completion
- Local professional body membership
- Continuing professional development compliance
```

### Phase 6: Data Security Enhancements

#### 6.1 Encryption Implementation

**Requirement:** Implement comprehensive encryption for all health data

**Technical Specifications:**

```typescript
// Encryption configuration
const encryptionConfig = {
  dataAtRest: {
    algorithm: 'AES-256-GCM',
    keyManagement: 'AWS KMS', // or equivalent EU-based service
    keyRotation: '90 days'
  },
  dataInTransit: {
    protocol: 'TLS 1.3',
    certificateAuthority: 'EU-based CA',
    perfectForwardSecrecy: true
  },
  videoConsultations: {
    endToEndEncryption: true,
    encryptionStandard: 'WebRTC with DTLS-SRTP',
    keyExchange: 'ECDHE'
  }
};

// Supabase configuration for encryption
const supabaseConfig = {
  database: {
    encryption: 'AES-256',
    encryptedColumns: [
      'patient_health_data',
      'consultation_notes',
      'prescription_data',
      'personal_identifiers'
    ]
  },
  storage: {
    encryption: 'AES-256',
    encryptedBuckets: [
      'medical-documents',
      'consultation-recordings',
      'patient-images'
    ]
  }
};
```

#### 6.2 Access Control Implementation

**Requirement:** Implement role-based access control with audit logging

**Access Control Matrix:**

```markdown
### Role Definitions
| Role | Health Data Access | Admin Functions | Patient Data | Audit Logs |
|------|-------------------|-----------------|--------------|------------|
| Patient | Own data only | Profile management | Own data | Own activities |
| Doctor | Assigned patients | Consultation management | Assigned patients | Own activities |
| Admin | No direct access | User management | Anonymized only | All activities |
| Support | Limited access | Ticket management | Pseudonymized | Support activities |
| DPO | Audit access only | Privacy management | Audit purposes | All activities |

### Technical Implementation
- JWT tokens with role-based claims
- Row-level security in Supabase
- API endpoint authorization middleware
- Audit logging for all data access
- Session management with timeout
```

### Phase 7: Zoom Integration Compliance

#### 7.1 GDPR-Compliant Zoom Configuration

**Requirement:** Ensure Zoom integration meets GDPR requirements

**Configuration Requirements:**

```javascript
const zoomGDPRConfig = {
  dataProcessingAddendum: true, // Ensure DPA is signed with Zoom
  dataResidency: 'EU', // Force EU data centers
  encryption: {
    endToEnd: true,
    waitingRoom: true,
    passwordProtection: true
  },
  recording: {
    cloudRecording: false, // Disable cloud recording
    localRecording: 'consent-based', // Only with explicit consent
    automaticDeletion: '30 days'
  },
  dataMinimization: {
    participantData: 'minimal',
    meetingMetadata: 'essential-only',
    chatLogs: 'healthcare-necessary'
  },
  accessControls: {
    waitingRoom: true,
    authentication: 'required',
    participantScreenSharing: 'host-only'
  }
};
```

#### 7.2 Alternative Video Solution Assessment

**Requirement:** Evaluate EU-based alternatives to Zoom for enhanced compliance

**Assessment Criteria:**

```markdown
### Evaluation Matrix
| Solution | EU-Based | GDPR Native | Healthcare Certified | Integration Effort |
|----------|----------|-------------|---------------------|-------------------|
| Zoom (Current) | Partial | DPA Required | HIPAA Available | Low (Existing) |
| Jitsi Meet | Yes | Yes | Limited | Medium |
| Whereby | Yes | Yes | Available | Medium |
| TrueConf | Yes | Yes | Available | High |
| Custom WebRTC | Yes | Yes | Custom | Very High |

### Recommendation
- **Short-term:** Enhance Zoom GDPR configuration
- **Medium-term:** Evaluate Whereby or TrueConf migration
- **Long-term:** Consider custom WebRTC solution for full control
```

### Phase 8: Audit and Monitoring System

#### 8.1 GDPR Audit Trail Implementation

**Requirement:** Comprehensive audit logging for all personal data processing

**Database Schema:**

```sql
CREATE TABLE gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  data_subject_id UUID,
  action_type ENUM('create', 'read', 'update', 'delete', 'export', 'anonymize'),
  data_category VARCHAR NOT NULL,
  legal_basis VARCHAR,
  processing_purpose VARCHAR,
  data_fields JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR,
  timestamp TIMESTAMP DEFAULT NOW(),
  retention_date DATE
);

CREATE INDEX idx_gdpr_audit_user ON gdpr_audit_log(user_id);
CREATE INDEX idx_gdpr_audit_subject ON gdpr_audit_log(data_subject_id);
CREATE INDEX idx_gdpr_audit_timestamp ON gdpr_audit_log(timestamp);
```

#### 8.2 Automated Compliance Monitoring

**Requirement:** Implement automated monitoring for compliance violations

**Monitoring Rules:**

```typescript
interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: string;
  action: 'alert' | 'block' | 'log';
}

const complianceRules: ComplianceRule[] = [
  {
    id: 'data_retention_violation',
    name: 'Data Retention Period Exceeded',
    description: 'Personal data retained beyond specified retention period',
    severity: 'high',
    condition: 'retention_date < NOW()',
    action: 'alert'
  },
  {
    id: 'unauthorized_health_data_access',
    name: 'Unauthorized Health Data Access',
    description: 'Access to health data without proper authorization',
    severity: 'critical',
    condition: 'health_data_access AND NOT authorized_role',
    action: 'block'
  },
  {
    id: 'consent_withdrawal_violation',
    name: 'Processing After Consent Withdrawal',
    description: 'Continued processing after consent withdrawal',
    severity: 'critical',
    condition: 'processing_activity AND consent_withdrawn',
    action: 'block'
  }
];
```

## Success Criteria

### Legal Compliance

- [ ] All legal document links functional and comprehensive

- [ ] GDPR Article 9 compliance for health data processing

- [ ] Professional qualification verification system operational

- [ ] Medical device compliance assessment completed

### Technical Implementation

- [ ] Comprehensive consent management system deployed

- [ ] End-to-end encryption for all health data

- [ ] Role-based access control with audit logging

- [ ] Automated compliance monitoring active

### Operational Readiness

- [ ] Staff trained on GDPR compliance procedures

- [ ] Data breach response procedures tested

- [ ] Compliance monitoring dashboard operational

- [ ] Regular compliance audit schedule established

-  processes



