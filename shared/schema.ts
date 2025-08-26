import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  uuid,
  integer,
  serial,
  decimal,
  boolean,
  time,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Legal Documents table for GDPR compliance
export const legalDocuments = pgTable("legal_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentType: varchar("document_type").notNull(), // privacy_policy, terms_of_service, gdpr_compliance, medical_disclaimer, cookie_policy
  version: varchar("version").notNull(),
  content: text("content").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// User Consents table for GDPR Article 9 compliance
export const userConsents = pgTable("user_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  consentType: varchar("consent_type").notNull(), // health_data_processing, marketing, cookies, data_sharing
  legalBasis: varchar("legal_basis").notNull(), // article_9_2_h, article_9_2_a, article_6_1_a, article_6_1_b
  consentGiven: boolean("consent_given").notNull(),
  consentDate: timestamp("consent_date").notNull(),
  consentWithdrawnDate: timestamp("consent_withdrawn_date"),
  documentVersion: varchar("document_version").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
});

// Data Subject Requests (GDPR Article 12-23)
export const dataSubjectRequests = pgTable("data_subject_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  requestType: text("request_type").notNull(), // access, rectification, erasure, portability, restriction, objection
  status: text("status").notNull().default('pending'), // pending, in_progress, completed, rejected
  description: text("description").notNull().default('Data subject request'),
  response: text("response"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  requestDetails: jsonb("request_details"),
  responseDetails: jsonb("response_details")
});

// GDPR Data Processing Records
export const gdprDataProcessingRecords = pgTable("gdpr_data_processing_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  processingPurpose: varchar("processing_purpose").notNull(),
  legalBasis: varchar("legal_basis").notNull(),
  dataCategories: jsonb("data_categories"),
  retentionPeriod: varchar("retention_period"),
  recipients: jsonb("recipients"),
  securityMeasures: jsonb("security_measures"),
  dataSource: varchar("data_source"),
  transferMechanism: varchar("transfer_mechanism"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Medical Device Regulation (MDR) Assessment Tables
export const medicalDeviceAssessments = pgTable("medical_device_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentDate: timestamp("assessment_date").notNull().defaultNow(),
  assessmentVersion: varchar("assessment_version", { length: 50 }).notNull(),
  assessmentType: varchar("assessment_type", { length: 100 }).notNull(),
  softwareName: varchar("software_name", { length: 255 }).notNull().default('Doktu Platform'),
  softwareVersion: varchar("software_version", { length: 50 }).notNull(),
  
  // MDCG 2019-11 Decision Tree
  isSoftware: boolean("is_software").notNull().default(true),
  isAccessory: boolean("is_accessory"),
  processesData: boolean("processes_data"),
  benefitIndividualPatients: boolean("benefit_individual_patients"),
  
  // Risk Classification
  medicalDeviceClass: varchar("medical_device_class", { length: 50 }),
  riskLevel: varchar("risk_level", { length: 50 }),
  
  // Assessment Details
  assessmentRationale: text("assessment_rationale"),
  regulatoryFramework: varchar("regulatory_framework", { length: 100 }).default('MDR 2017/745'),
  notifiedBodyRequired: boolean("notified_body_required").default(false),
  ceMarkingRequired: boolean("ce_marking_required").default(false),
  
  // Clinical Functions
  diagnosticFeatures: jsonb("diagnostic_features"),
  treatmentFeatures: jsonb("treatment_features"),
  monitoringFeatures: jsonb("monitoring_features"),
  calculationFeatures: jsonb("calculation_features"),
  
  // Compliance Status
  complianceStatus: varchar("compliance_status", { length: 50 }).default('assessment_pending'),
  complianceGaps: jsonb("compliance_gaps"),
  remediationPlan: jsonb("remediation_plan"),
  
  // Metadata
  assessedBy: integer("assessed_by").references(() => users.id),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  nextReviewDate: date("next_review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const medicalDeviceFunctions = pgTable("medical_device_functions", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").references(() => medicalDeviceAssessments.id),
  functionCategory: varchar("function_category", { length: 100 }).notNull(),
  functionName: varchar("function_name", { length: 255 }).notNull(),
  functionDescription: text("function_description").notNull(),
  
  // Risk Assessment
  potentialHarm: varchar("potential_harm", { length: 100 }),
  likelihoodOfHarm: varchar("likelihood_of_harm", { length: 100 }),
  riskMitigation: text("risk_mitigation"),
  
  // Medical Purpose
  medicalPurpose: text("medical_purpose"),
  intendedUsers: varchar("intended_users", { length: 255 }),
  clinicalBenefit: text("clinical_benefit"),
  
  // Regulatory Impact
  affectsClassification: boolean("affects_classification").default(false),
  requiresClinicalEvidence: boolean("requires_clinical_evidence").default(false),
  requiresPerformanceValidation: boolean("requires_performance_validation").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mdrComplianceRequirements = pgTable("mdr_compliance_requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").references(() => medicalDeviceAssessments.id),
  requirementCategory: varchar("requirement_category", { length: 100 }).notNull(),
  requirementName: varchar("requirement_name", { length: 255 }).notNull(),
  requirementDescription: text("requirement_description"),
  
  // Regulatory Reference
  regulationReference: varchar("regulation_reference", { length: 100 }),
  standardReference: varchar("standard_reference", { length: 100 }),
  
  // Compliance Status
  complianceStatus: varchar("compliance_status", { length: 50 }).default('not_assessed'),
  evidenceProvided: text("evidence_provided"),
  gapsIdentified: text("gaps_identified"),
  remediationActions: text("remediation_actions"),
  targetCompletionDate: date("target_completion_date"),
  
  // Priority and Risk
  priority: varchar("priority", { length: 50 }).default('medium'),
  riskIfNonCompliant: text("risk_if_non_compliant"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Professional Qualification Verification Tables (Phase 5)
export const doctorQualifications = pgTable("doctor_qualifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  qualificationType: varchar("qualification_type", { length: 50 }).notNull(),
  issuingAuthority: varchar("issuing_authority", { length: 255 }).notNull(),
  qualificationNumber: varchar("qualification_number", { length: 255 }).notNull(),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  
  // Verification Status
  verificationStatus: varchar("verification_status", { length: 50 }).default('pending'),
  verificationDate: date("verification_date"),
  verificationMethod: varchar("verification_method", { length: 255 }),
  verificationReference: varchar("verification_reference", { length: 255 }),
  
  // EU Recognition
  euRecognitionStatus: varchar("eu_recognition_status", { length: 50 }),
  homeMemberState: varchar("home_member_state", { length: 100 }),
  hostMemberStates: text("host_member_states").array(),
  
  // Supporting Documents
  supportingDocuments: jsonb("supporting_documents"),
  documentUrls: text("document_urls").array(),
  
  // Additional Details
  qualificationCountry: varchar("qualification_country", { length: 100 }),
  qualificationLanguage: varchar("qualification_language", { length: 50 }),
  specialization: varchar("specialization", { length: 255 }),
  institutionName: varchar("institution_name", { length: 255 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const professionalInsurance = pgTable("professional_insurance", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  insuranceProvider: varchar("insurance_provider", { length: 255 }).notNull(),
  policyNumber: varchar("policy_number", { length: 255 }).notNull(),
  coverageAmount: decimal("coverage_amount", { precision: 12, scale: 2 }),
  coverageCurrency: varchar("coverage_currency", { length: 10 }).default('EUR'),
  coverageTerritory: varchar("coverage_territory", { length: 255 }).notNull(),
  
  // Coverage Dates
  effectiveDate: date("effective_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  
  // Coverage Details
  coverageType: varchar("coverage_type", { length: 100 }),
  coverageScope: jsonb("coverage_scope"),
  exclusions: jsonb("exclusions"),
  deductible: decimal("deductible", { precision: 10, scale: 2 }),
  
  // Verification
  verificationStatus: varchar("verification_status", { length: 50 }).default('pending'),
  verificationDate: date("verification_date"),
  verificationNotes: text("verification_notes"),
  
  // Compliance
  meetsEuRequirements: boolean("meets_eu_requirements").default(false),
  meetsHostStateRequirements: jsonb("meets_host_state_requirements"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crossBorderDeclarations = pgTable("cross_border_declarations", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  declarationType: varchar("declaration_type", { length: 50 }).notNull(),
  
  // Home State Information
  homeMemberState: varchar("home_member_state", { length: 100 }).notNull(),
  homeRegistrationNumber: varchar("home_registration_number", { length: 255 }),
  homeProfessionalBody: varchar("home_professional_body", { length: 255 }),
  
  // Host State Information
  hostMemberState: varchar("host_member_state", { length: 100 }).notNull(),
  hostRegistrationNumber: varchar("host_registration_number", { length: 255 }),
  hostProfessionalBody: varchar("host_professional_body", { length: 255 }),
  
  // Declaration Details
  declarationDate: date("declaration_date").notNull(),
  validityStartDate: date("validity_start_date").notNull(),
  validityEndDate: date("validity_end_date"),
  servicesToProvide: text("services_to_provide").array(),
  
  // Status
  status: varchar("status", { length: 50 }).default('pending'),
  approvalDate: date("approval_date"),
  rejectionReason: text("rejection_reason"),
  
  // Requirements
  languageCompetencyVerified: boolean("language_competency_verified").default(false),
  languageCertificateReference: varchar("language_certificate_reference", { length: 255 }),
  adaptationPeriodRequired: boolean("adaptation_period_required").default(false),
  adaptationPeriodCompleted: boolean("adaptation_period_completed").default(false),
  aptitudeTestRequired: boolean("aptitude_test_required").default(false),
  aptitudeTestPassed: boolean("aptitude_test_passed").default(false),
  
  supportingDocuments: jsonb("supporting_documents"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const euProfessionalCards = pgTable("eu_professional_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  epcNumber: varchar("epc_number", { length: 255 }).notNull().unique(),
  
  // Card Details
  issueDate: date("issue_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  issuingAuthority: varchar("issuing_authority", { length: 255 }),
  issuingCountry: varchar("issuing_country", { length: 100 }),
  
  // Professional Information
  professionalTitle: varchar("professional_title", { length: 255 }),
  specializations: text("specializations").array(),
  qualificationsIncluded: jsonb("qualifications_included"),
  
  // Recognition Status
  recognizedInCountries: text("recognized_in_countries").array(),
  temporaryMobilityDeclaration: boolean("temporary_mobility_declaration").default(false),
  permanentEstablishment: boolean("permanent_establishment").default(false),
  
  // Verification
  verificationStatus: varchar("verification_status", { length: 50 }).default('pending'),
  lastVerificationDate: date("last_verification_date"),
  verificationUrl: varchar("verification_url", { length: 500 }),
  
  // Digital Signature
  digitalSignature: text("digital_signature"),
  signatureValid: boolean("signature_valid"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table - normalized with structured name fields only
export const users = pgTable("users", {
  id: serial("id").primaryKey(), // Use serial for auto-increment
  email: varchar("email").unique(),
  title: varchar("title"), // Dr., M., Mme., etc.
  firstName: varchar("first_name"), // Structured first name
  lastName: varchar("last_name"), // Structured last name  
  phone: varchar("phone"), // Phone number
  profileImageUrl: varchar("profile_image_url"), // Profile image URL
  role: varchar("role").notNull().default("patient"), // patient, doctor, admin
  approved: boolean("approved").default(false), // for doctor approval
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe customer ID
  stripeSubscriptionId: varchar("stripe_subscription_id"), // Stripe subscription ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Doctors table  
export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(), // Use serial for auto-increment
  userId: integer("user_id").references(() => users.id).notNull(),
  specialty: varchar("specialty").notNull(),
  bio: text("bio"),
  education: text("education"),
  experience: text("experience"),
  languages: text("languages").array(),
  rppsNumber: varchar("rpps_number"), // French medical registration number
  consultationPrice: decimal("consultation_price", { precision: 10, scale: 2 }).notNull().default("35.00"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  reviewCount: integer("review_count").default(0),
  // isOnline: boolean("is_online").default(false), // Column not in Supabase
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Doctor time slots for availability  
export const doctorTimeSlots = pgTable("doctor_time_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: integer("doctor_id").notNull(), // Use integer to match doctors.id
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isAvailable: boolean("is_available").default(true),
  lockedUntil: timestamp("locked_until"),
  lockedBy: varchar("locked_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pending appointments (for holding slots during booking)
export const appointmentPending = pgTable("appointment_pending", {
  id: uuid("id").primaryKey().defaultRandom(),
  timeSlotId: uuid("time_slot_id").references(() => doctorTimeSlots.id).notNull(),
  sessionId: varchar("session_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments - matching actual Supabase structure exactly
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  status: varchar("status").notNull().default("pending"),
  paymentIntentId: varchar("payment_intent_id"),
  clientSecret: varchar("client_secret"),
  zoomMeetingId: varchar("zoom_meeting_id"),
  zoomJoinUrl: text("zoom_join_url"),
  zoomStartUrl: text("zoom_start_url"),
  zoomPassword: varchar("zoom_password"),
  cancelReason: text("cancel_reason"),
  cancelledBy: varchar("cancelled_by"),
  rescheduleCount: integer("reschedule_count").default(0),
  slotId: uuid("slot_id").references(() => doctorTimeSlots.id),
  price: decimal("price", { precision: 10, scale: 2 }).default("35.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointment changes tracking
export const appointmentChanges = pgTable("appointment_changes", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: integer("appointment_id").references(() => appointments.id, { onDelete: "cascade" }).notNull(),
  action: varchar("action").notNull(), // reschedule, cancel
  actorId: integer("actor_id").references(() => users.id),
  actorRole: varchar("actor_role"),
  reason: text("reason"),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews and ratings
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: integer("appointment_id").references(() => appointments.id).notNull(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Patient records - one per patient/doctor pair
export const patientRecords = pgTable("patient_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Ensure unique patient-doctor pairs
  index("idx_patient_doctor_unique").on(table.patientId, table.doctorId)
]);

// Consultation notes - linked to appointments
export const consultationNotes = pgTable("consultation_notes", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointments.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  contentMd: text("content_md").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patient files - documents uploaded by patients or doctors
export const patientFiles = pgTable("patient_files", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id), // nullable - can be uploaded by patient
  appointmentId: integer("appointment_id").references(() => appointments.id), // nullable - general files
  filename: varchar("filename").notNull(),
  originalFilename: varchar("original_filename").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storageUrl: text("storage_url").notNull(),
  uploadedByRole: varchar("uploaded_by_role").notNull(), // 'patient' or 'doctor'
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Patient Health Profiles
export const healthProfiles = pgTable("health_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: integer("patient_id").references(() => users.id).notNull().unique(),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender"),
  height: varchar("height"),
  weight: varchar("weight"),
  bloodType: varchar("blood_type"),
  allergies: text("allergies").array(),
  medications: text("medications").array(),
  medicalHistory: text("medical_history").array(),
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  profileStatus: varchar("profile_status").notNull().default("incomplete"), // incomplete, complete, needs_review
  completionScore: integer("completion_score").default(0), // 0-100
  lastReviewedAt: timestamp("last_reviewed_at"),
  needsReviewAfter: timestamp("needs_review_after"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Library - Patient's personal document library
export const documentUploads = pgTable("document_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type").notNull(),
  uploadUrl: text("upload_url").notNull(),
  documentType: varchar("document_type"), // medical_report, prescription, insurance, other
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Appointment Documents - Junction table for document-appointment attachments
export const appointmentDocuments = pgTable("appointment_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: integer("appointment_id").references(() => appointments.id).notNull(),
  documentId: uuid("document_id").references(() => documentUploads.id).notNull(),
  attachedAt: timestamp("attached_at").defaultNow(),
}, (table) => [
  // Ensure unique document-appointment pairs
  index("idx_appointment_document_unique").on(table.appointmentId, table.documentId)
]);

// Banner Dismissals (to track when users dismiss banners)
export const bannerDismissals = pgTable("banner_dismissals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  bannerType: varchar("banner_type").notNull(), // health_profile, document_reminder, etc.
  dismissedAt: timestamp("dismissed_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // When the dismissal expires and banner can show again
});

// Schema Types
export const insertHealthProfileSchema = createInsertSchema(healthProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertHealthProfile = z.infer<typeof insertHealthProfileSchema>;
export type HealthProfile = typeof healthProfiles.$inferSelect;

export const insertDocumentUploadSchema = createInsertSchema(documentUploads).omit({
  id: true,
  uploadedAt: true,
});
export type InsertDocumentUpload = z.infer<typeof insertDocumentUploadSchema>;
export type DocumentUpload = typeof documentUploads.$inferSelect;

export const insertAppointmentDocumentSchema = createInsertSchema(appointmentDocuments).omit({
  id: true,
  attachedAt: true,
});
export type InsertAppointmentDocument = z.infer<typeof insertAppointmentDocumentSchema>;
export type AppointmentDocument = typeof appointmentDocuments.$inferSelect;

export const insertBannerDismissalSchema = createInsertSchema(bannerDismissals).omit({
  id: true,
  dismissedAt: true,
});
export type InsertBannerDismissal = z.infer<typeof insertBannerDismissalSchema>;
export type BannerDismissal = typeof bannerDismissals.$inferSelect;

// Zod schemas for patient records tables
export const insertPatientRecordSchema = createInsertSchema(patientRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertConsultationNoteSchema = createInsertSchema(consultationNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPatientFileSchema = createInsertSchema(patientFiles).omit({
  id: true,
  uploadedAt: true,
});

export type InsertPatientRecord = z.infer<typeof insertPatientRecordSchema>;
export type InsertConsultationNote = z.infer<typeof insertConsultationNoteSchema>;
export type InsertPatientFile = z.infer<typeof insertPatientFileSchema>;

export type PatientRecord = typeof patientRecords.$inferSelect;
export type ConsultationNote = typeof consultationNotes.$inferSelect;
export type PatientFile = typeof patientFiles.$inferSelect;

// Video test results
export const videoTests = pgTable("video_tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id).notNull(),
  passed: boolean("passed").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment transactions
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").references(() => appointments.id).notNull(),
  patientId: varchar("patient_id").references(() => users.id).notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique().notNull(),
  stripeChargeId: varchar("stripe_charge_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("EUR"),
  status: varchar("status").notNull(), // pending, succeeded, failed, refunded
  paymentMethod: varchar("payment_method"), // card, sepa, etc.
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundReason: text("refund_reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patient profiles (extended user data)
export const patientProfiles = pgTable("patient_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender"),
  address: text("address"),
  city: varchar("city"),
  postalCode: varchar("postal_code"),
  country: varchar("country").default("FR"),
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  medicalHistory: text("medical_history"),
  allergies: text("allergies").array(),
  currentMedications: text("current_medications").array(),
  insuranceProvider: varchar("insurance_provider"),
  insuranceNumber: varchar("insurance_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Membership Plans (defines available subscription plans)
export const membershipPlans = pgTable("membership_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(), // "Monthly", "6-Month"
  description: text("description"),
  priceAmount: decimal("price_amount", { precision: 10, scale: 2 }).notNull(), // 45.00, 219.00
  currency: varchar("currency").notNull().default("EUR"),
  billingInterval: varchar("billing_interval").notNull(), // "month", "6_months"
  intervalCount: integer("interval_count").notNull().default(1), // 1 for monthly, 6 for semi-annual
  allowancePerCycle: integer("allowance_per_cycle").notNull().default(2), // 2 consultations per month
  stripePriceId: varchar("stripe_price_id").notNull(), // Stripe price ID
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Membership Subscriptions (links patient to plan)
export const membershipSubscriptions = pgTable("membership_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  planId: uuid("plan_id").references(() => membershipPlans.id).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique().notNull(),
  stripeCustomerId: varchar("stripe_customer_id").notNull(),
  status: varchar("status").notNull(), // active, suspended, ended, pending_cancel
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  activatedAt: timestamp("activated_at").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  endsAt: timestamp("ends_at"), // When subscription actually ends after cancellation
  trialEnd: timestamp("trial_end"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Membership Cycles (tracks allowance per billing cycle)
export const membershipCycles = pgTable("membership_cycles", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => membershipSubscriptions.id, { onDelete: "cascade" }).notNull(),
  cycleStart: timestamp("cycle_start").notNull(),
  cycleEnd: timestamp("cycle_end").notNull(),
  allowanceGranted: integer("allowance_granted").notNull().default(2),
  allowanceUsed: integer("allowance_used").notNull().default(0),
  allowanceRemaining: integer("allowance_remaining").notNull().default(2),
  resetDate: timestamp("reset_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Membership Allowance Events (audit trail for allowance changes)
export const membershipAllowanceEvents = pgTable("membership_allowance_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => membershipSubscriptions.id, { onDelete: "cascade" }).notNull(),
  cycleId: uuid("cycle_id").references(() => membershipCycles.id, { onDelete: "cascade" }).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  eventType: varchar("event_type").notNull(), // grant, consume, restore
  allowanceChange: integer("allowance_change").notNull(), // +2, -1, +1
  allowanceBefore: integer("allowance_before").notNull(),
  allowanceAfter: integer("allowance_after").notNull(),
  reason: varchar("reason"), // cycle_start, booking_confirmed, early_cancel, doctor_cancel
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointment Coverage (tracks if appointment is covered by membership)
export const appointmentCoverage = pgTable("appointment_coverage", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: integer("appointment_id").references(() => appointments.id, { onDelete: "cascade" }).notNull().unique(),
  subscriptionId: uuid("subscription_id").references(() => membershipSubscriptions.id),
  cycleId: uuid("cycle_id").references(() => membershipCycles.id),
  allowanceEventId: uuid("allowance_event_id").references(() => membershipAllowanceEvents.id),
  coverageType: varchar("coverage_type").notNull(), // covered, pay_per_visit
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
  coveredAmount: decimal("covered_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  patientPaid: decimal("patient_paid", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Billing Attempts (tracks payment attempts and failures)
export const billingAttempts = pgTable("billing_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => membershipSubscriptions.id, { onDelete: "cascade" }).notNull(),
  stripeInvoiceId: varchar("stripe_invoice_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("EUR"),
  status: varchar("status").notNull(), // succeeded, failed, pending, requires_action
  attemptCount: integer("attempt_count").notNull().default(1),
  failureReason: varchar("failure_reason"),
  failureCode: varchar("failure_code"),
  nextRetryAt: timestamp("next_retry_at"),
  billingReason: varchar("billing_reason").notNull(), // subscription_create, subscription_cycle, subscription_update
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin dashboard metrics
export const dashboardMetrics = pgTable("dashboard_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  metricType: varchar("metric_type").notNull(), // daily_revenue, monthly_appointments, etc.
  period: date("period").notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // appointment_reminder, payment_confirmation, etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews table already defined above

// Analytics events for frontend tracking
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  eventType: varchar("event_type").notNull(), // page_view, discovery, booking_started, etc.
  eventData: jsonb("event_data"), // flexible JSON data for event properties
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit events
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  resourceType: varchar("resource_type"),
  resourceId: varchar("resource_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email notification queue and logs
export const emailNotifications = pgTable("email_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  triggerCode: varchar("trigger_code").notNull(), // BOOK_CONF, REM_24H, etc.
  templateKey: varchar("template_key").notNull(), // booking_confirmation, etc.
  status: varchar("status").notNull().default("pending"), // pending, sent, failed, bounced
  priority: integer("priority").notNull().default(50),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  retryCount: integer("retry_count").default(0),
  errorMessage: text("error_message"),
  mergeData: jsonb("merge_data"), // Variables to merge into template
  metadata: jsonb("metadata"), // Additional data like .ics attachment info
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SMS notification queue
export const smsNotifications = pgTable("sms_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  triggerCode: varchar("trigger_code").notNull(),
  templateKey: varchar("template_key").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  status: varchar("status").notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  retryCount: integer("retry_count").default(0),
  errorMessage: text("error_message"),
  mergeData: jsonb("merge_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Push notification queue
export const pushNotifications = pgTable("push_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  triggerCode: varchar("trigger_code").notNull(),
  templateKey: varchar("template_key").notNull(),
  status: varchar("status").notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  mergeData: jsonb("merge_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced user notification preferences for Universal Notification System
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  
  // Channel preferences
  emailEnabled: boolean("email_enabled").default(true),
  smsEnabled: boolean("sms_enabled").default(false),
  pushEnabled: boolean("push_enabled").default(false),
  
  // Category preferences (granular control)
  transactionalEnabled: boolean("transactional_enabled").default(true), // Cannot be disabled
  securityEnabled: boolean("security_enabled").default(true), // Cannot be disabled
  appointmentRemindersEnabled: boolean("appointment_reminders_enabled").default(true),
  marketingEmailsEnabled: boolean("marketing_emails_enabled").default(true),
  lifeCycleEnabled: boolean("life_cycle_enabled").default(true),
  documentNotificationsEnabled: boolean("document_notifications_enabled").default(true),
  membershipNotificationsEnabled: boolean("membership_notifications_enabled").default(true),
  
  // Timing preferences
  reminderTiming: jsonb("reminder_timing"), // Custom reminder preferences
  quietHoursStart: time("quiet_hours_start").default("22:00:00"), // Default 22:00
  quietHoursEnd: time("quiet_hours_end").default("08:00:00"), // Default 08:00
  
  // Localization
  locale: varchar("locale").default("en"), // Language preference for notifications
  timezone: varchar("timezone").default("Europe/Paris"), // User timezone for scheduling
  
  // Frequency limits
  marketingEmailsPerWeek: integer("marketing_emails_per_week").default(1),
  lifeCycleNudgesPerWeek: integer("life_cycle_nudges_per_week").default(3),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// In-app notifications (banners and inbox)
export const inAppNotifications = pgTable("in_app_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  
  // Notification details
  type: varchar("type").notNull(), // banner, inbox
  triggerCode: varchar("trigger_code").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  ctaText: varchar("cta_text"),
  ctaUrl: varchar("cta_url"),
  
  // Display properties
  priority: integer("priority").notNull().default(50), // Higher = more important
  style: varchar("style").default("info"), // success, warning, error, info, urgent
  persistent: boolean("persistent").default(false), // Whether it auto-dismisses
  autoDismissSeconds: integer("auto_dismiss_seconds").default(10),
  
  // Status tracking
  status: varchar("status").notNull().default("pending"), // pending, delivered, read, dismissed
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  dismissedAt: timestamp("dismissed_at"),
  
  // Suppression and scheduling
  scheduledFor: timestamp("scheduled_for").notNull(),
  expiresAt: timestamp("expires_at"),
  suppressedBy: uuid("suppressed_by"), // Higher priority notification that suppressed this
  
  // Metadata
  mergeData: jsonb("merge_data"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification audit log for comprehensive tracking
export const notificationAuditLog = pgTable("notification_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  
  // Event details
  eventType: varchar("event_type").notNull(), // scheduled, sent, delivered, opened, clicked, bounced, failed, suppressed
  channel: varchar("channel").notNull(), // email, sms, push, in_app_banner, in_app_inbox
  triggerCode: varchar("trigger_code").notNull(),
  
  // References to actual notifications
  emailNotificationId: uuid("email_notification_id").references(() => emailNotifications.id),
  smsNotificationId: uuid("sms_notification_id").references(() => smsNotifications.id),
  pushNotificationId: uuid("push_notification_id").references(() => pushNotifications.id),
  inAppNotificationId: uuid("in_app_notification_id").references(() => inAppNotifications.id),
  
  // Event metadata
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  details: jsonb("details"), // Additional event-specific data
  errorMessage: text("error_message"),
  
  // User context
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  locale: varchar("locale"),
  timezone: varchar("timezone"),
});

// Notification suppression rules (priority-based)
export const notificationSuppressionRules = pgTable("notification_suppression_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  suppressorTrigger: varchar("suppressor_trigger").notNull(), // Higher priority trigger
  suppressedTrigger: varchar("suppressed_trigger").notNull(), // Lower priority trigger to suppress
  suppressionDuration: integer("suppression_duration").notNull(), // Minutes to suppress for
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification frequency tracking (for caps)
export const notificationFrequencyTracking = pgTable("notification_frequency_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  category: varchar("category").notNull(), // marketing, lifecycle, reminder, etc.
  channel: varchar("channel").notNull(), // email, sms, push
  weekStarting: date("week_starting").notNull(), // Monday of the week
  sentCount: integer("sent_count").default(0),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema exports and types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertDoctorSchema = createInsertSchema(doctors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctors.$inferSelect;

export const insertTimeSlotSchema = createInsertSchema(doctorTimeSlots).omit({
  id: true,
  createdAt: true,
});
export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;
export type TimeSlot = typeof doctorTimeSlots.$inferSelect;

// Pending appointment types
export const insertAppointmentPendingSchema = createInsertSchema(appointmentPending).omit({
  id: true,
  createdAt: true,
});
export type InsertAppointmentPending = z.infer<typeof insertAppointmentPendingSchema>;
export type AppointmentPending = typeof appointmentPending.$inferSelect;

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export const insertAppointmentChangesSchema = createInsertSchema(appointmentChanges).omit({
  id: true,
  createdAt: true,
});
export type InsertAppointmentChanges = z.infer<typeof insertAppointmentChangesSchema>;
export type AppointmentChanges = typeof appointmentChanges.$inferSelect;

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export const insertPatientProfileSchema = createInsertSchema(patientProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPatientProfile = z.infer<typeof insertPatientProfileSchema>;
export type PatientProfile = typeof patientProfiles.$inferSelect;

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const insertDashboardMetricSchema = createInsertSchema(dashboardMetrics).omit({
  id: true,
  createdAt: true,
});
export type InsertDashboardMetric = z.infer<typeof insertDashboardMetricSchema>;
export type DashboardMetric = typeof dashboardMetrics.$inferSelect;

export const insertUserConsentsSchema = createInsertSchema(userConsents).omit({
  id: true,
});
export type InsertUserConsents = z.infer<typeof insertUserConsentsSchema>;
export type UserConsents = typeof userConsents.$inferSelect;

export const insertGdprDataProcessingRecordsSchema = createInsertSchema(gdprDataProcessingRecords).omit({
  id: true,
  createdAt: true,
});
export type InsertGdprDataProcessingRecords = z.infer<typeof insertGdprDataProcessingRecordsSchema>;
export type GdprDataProcessingRecords = typeof gdprDataProcessingRecords.$inferSelect;

export const insertLegalDocumentsSchema = createInsertSchema(legalDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLegalDocuments = z.infer<typeof insertLegalDocumentsSchema>;
export type LegalDocuments = typeof legalDocuments.$inferSelect;

export const insertMedicalDeviceAssessmentsSchema = createInsertSchema(medicalDeviceAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMedicalDeviceAssessments = z.infer<typeof insertMedicalDeviceAssessmentsSchema>;
export type MedicalDeviceAssessments = typeof medicalDeviceAssessments.$inferSelect;

export const insertMedicalDeviceFunctionsSchema = createInsertSchema(medicalDeviceFunctions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMedicalDeviceFunctions = z.infer<typeof insertMedicalDeviceFunctionsSchema>;
export type MedicalDeviceFunctions = typeof medicalDeviceFunctions.$inferSelect;

export const insertMdrComplianceRequirementsSchema = createInsertSchema(mdrComplianceRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMdrComplianceRequirements = z.infer<typeof insertMdrComplianceRequirementsSchema>;
export type MdrComplianceRequirements = typeof mdrComplianceRequirements.$inferSelect;

export const insertDoctorQualificationsSchema = createInsertSchema(doctorQualifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDoctorQualifications = z.infer<typeof insertDoctorQualificationsSchema>;
export type DoctorQualifications = typeof doctorQualifications.$inferSelect;

export const insertProfessionalInsuranceSchema = createInsertSchema(professionalInsurance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProfessionalInsurance = z.infer<typeof insertProfessionalInsuranceSchema>;
export type ProfessionalInsurance = typeof professionalInsurance.$inferSelect;

export const insertCrossBorderDeclarationsSchema = createInsertSchema(crossBorderDeclarations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCrossBorderDeclarations = z.infer<typeof insertCrossBorderDeclarationsSchema>;
export type CrossBorderDeclarations = typeof crossBorderDeclarations.$inferSelect;

export const insertEuProfessionalCardsSchema = createInsertSchema(euProfessionalCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEuProfessionalCards = z.infer<typeof insertEuProfessionalCardsSchema>;
export type EuProfessionalCards = typeof euProfessionalCards.$inferSelect;

// Phase 6: Data Security Enhancements Tables

export const encryptionKeys = pgTable('encryption_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  keyName: varchar('key_name', { length: 255 }).notNull().unique(),
  keyType: varchar('key_type', { length: 50 }).notNull(), // 'data_at_rest', 'data_in_transit', 'video'
  algorithm: varchar('algorithm', { length: 100 }).notNull(),
  keyVersion: integer('key_version').default(1),
  keyMaterial: text('key_material'), // Encrypted key material
  rotationPeriodDays: integer('rotation_period_days').default(90),
  lastRotatedAt: timestamp('last_rotated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isActive: boolean('is_active').default(true)
});

export const accessControlRoles = pgTable('access_control_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  roleName: varchar('role_name', { length: 50 }).notNull().unique(),
  description: text('description'),
  healthDataAccess: varchar('health_data_access', { length: 100 }), // 'own', 'assigned', 'none', 'audit'
  adminFunctions: varchar('admin_functions', { length: 100 }), // 'full', 'user_management', 'none'
  patientDataAccess: varchar('patient_data_access', { length: 100 }), // 'own', 'assigned', 'anonymized', 'pseudonymized'
  auditLogAccess: varchar('audit_log_access', { length: 100 }), // 'own', 'all', 'support', 'none'
  permissions: jsonb('permissions').$default(() => ({})),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const userRoleAssignments = pgTable('user_role_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => accessControlRoles.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => users.id),
  assignedAt: timestamp('assigned_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true)
});

export const dataAccessAuditLog = pgTable('data_access_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  resourceType: varchar('resource_type', { length: 100 }).notNull(), // 'health_data', 'patient_record', etc.
  resourceId: uuid('resource_id'),
  action: varchar('action', { length: 50 }).notNull(), // 'view', 'create', 'update', 'delete', 'export'
  accessGranted: boolean('access_granted').notNull(),
  denialReason: text('denial_reason'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 255 }),
  requestMetadata: jsonb('request_metadata').$default(() => ({})),
  timestamp: timestamp('timestamp').defaultNow()
});

export const encryptedColumns = pgTable('encrypted_columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableName: varchar('table_name', { length: 255 }).notNull(),
  columnName: varchar('column_name', { length: 255 }).notNull(),
  encryptionAlgorithm: varchar('encryption_algorithm', { length: 100 }).default('AES-256-GCM'),
  keyId: uuid('key_id').references(() => encryptionKeys.id),
  isEncrypted: boolean('is_encrypted').default(false),
  encryptedAt: timestamp('encrypted_at'),
  createdAt: timestamp('created_at').defaultNow()
});

export const secureSessions = pgTable('secure_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: varchar('session_token', { length: 500 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').references(() => accessControlRoles.id),
  jwtClaims: jsonb('jwt_claims').$default(() => ({})),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivity: timestamp('last_activity').defaultNow(),
  revokedAt: timestamp('revoked_at'),
  revokeReason: text('revoke_reason'),
  isActive: boolean('is_active').default(true)
});

export const dataBreachIncidents = pgTable('data_breach_incidents', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentDate: timestamp('incident_date').notNull(),
  detectedDate: timestamp('detected_date').notNull(),
  reportedDate: timestamp('reported_date'),
  incidentType: varchar('incident_type', { length: 100 }).notNull(), // 'unauthorized_access', 'data_leak', 'system_breach'
  severity: varchar('severity', { length: 50 }).notNull(), // 'critical', 'high', 'medium', 'low'
  affectedRecords: integer('affected_records'),
  affectedUsers: uuid('affected_users').array().$default(() => []),
  description: text('description').notNull(),
  rootCause: text('root_cause'),
  remediationActions: text('remediation_actions'),
  notificationSent: boolean('notification_sent').default(false),
  notificationDate: timestamp('notification_date'),
  reportedToAuthority: boolean('reported_to_authority').default(false),
  authorityReportDate: timestamp('authority_report_date'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Membership Zod schemas
export const insertMembershipPlanSchema = createInsertSchema(membershipPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMembershipPlan = z.infer<typeof insertMembershipPlanSchema>;
export type MembershipPlan = typeof membershipPlans.$inferSelect;

export const insertMembershipSubscriptionSchema = createInsertSchema(membershipSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMembershipSubscription = z.infer<typeof insertMembershipSubscriptionSchema>;
export type MembershipSubscription = typeof membershipSubscriptions.$inferSelect;

export const insertMembershipCycleSchema = createInsertSchema(membershipCycles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMembershipCycle = z.infer<typeof insertMembershipCycleSchema>;
export type MembershipCycle = typeof membershipCycles.$inferSelect;

export const insertMembershipAllowanceEventSchema = createInsertSchema(membershipAllowanceEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertMembershipAllowanceEvent = z.infer<typeof insertMembershipAllowanceEventSchema>;
export type MembershipAllowanceEvent = typeof membershipAllowanceEvents.$inferSelect;

export const insertAppointmentCoverageSchema = createInsertSchema(appointmentCoverage).omit({
  id: true,
  createdAt: true,
});
export type InsertAppointmentCoverage = z.infer<typeof insertAppointmentCoverageSchema>;
export type AppointmentCoverage = typeof appointmentCoverage.$inferSelect;

export const insertBillingAttemptSchema = createInsertSchema(billingAttempts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBillingAttempt = z.infer<typeof insertBillingAttemptSchema>;
export type BillingAttempt = typeof billingAttempts.$inferSelect;

// Export types for Phase 6 tables
export const insertEncryptionKeysSchema = createInsertSchema(encryptionKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRotatedAt: true
});
export type InsertEncryptionKeys = z.infer<typeof insertEncryptionKeysSchema>;
export type EncryptionKeys = typeof encryptionKeys.$inferSelect;

export const insertAccessControlRolesSchema = createInsertSchema(accessControlRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertAccessControlRoles = z.infer<typeof insertAccessControlRolesSchema>;
export type AccessControlRoles = typeof accessControlRoles.$inferSelect;

export const insertUserRoleAssignmentsSchema = createInsertSchema(userRoleAssignments).omit({
  id: true,
  assignedAt: true
});
export type InsertUserRoleAssignments = z.infer<typeof insertUserRoleAssignmentsSchema>;
export type UserRoleAssignments = typeof userRoleAssignments.$inferSelect;

export const insertDataAccessAuditLogSchema = createInsertSchema(dataAccessAuditLog).omit({
  id: true,
  timestamp: true
});
export type InsertDataAccessAuditLog = z.infer<typeof insertDataAccessAuditLogSchema>;
export type DataAccessAuditLog = typeof dataAccessAuditLog.$inferSelect;

export const insertEncryptedColumnsSchema = createInsertSchema(encryptedColumns).omit({
  id: true,
  createdAt: true
});
export type InsertEncryptedColumns = z.infer<typeof insertEncryptedColumnsSchema>;
export type EncryptedColumns = typeof encryptedColumns.$inferSelect;

export const insertSecureSessionsSchema = createInsertSchema(secureSessions).omit({
  id: true,
  createdAt: true,
  lastActivity: true
});
export type InsertSecureSessions = z.infer<typeof insertSecureSessionsSchema>;
export type SecureSessions = typeof secureSessions.$inferSelect;

export const insertDataBreachIncidentsSchema = createInsertSchema(dataBreachIncidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertDataBreachIncidents = z.infer<typeof insertDataBreachIncidentsSchema>;
export type DataBreachIncidents = typeof dataBreachIncidents.$inferSelect;

// Notification System Tables
export const notificationTemplates = pgTable('notification_templates', {
  id: serial('id').primaryKey(),
  triggerCode: varchar('trigger_code', { length: 100 }).unique().notNull(),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  description: text('description'),
  channel: varchar('channel', { length: 50 }).notNull(),
  priorityLevel: integer('priority_level').default(3),
  templateContent: jsonb('template_content'),
  variables: jsonb('variables'),
  frequencyCapHours: integer('frequency_cap_hours'),
  batchWindowMinutes: integer('batch_window_minutes'),
  autoDismissSeconds: integer('auto_dismiss_seconds').default(10),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const notificationQueue = pgTable('notification_queue', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  triggerCode: varchar('trigger_code', { length: 100 }).notNull(),
  channel: varchar('channel', { length: 50 }).notNull(),
  priorityLevel: integer('priority_level').default(3),
  templateData: jsonb('template_data'),
  scheduledFor: timestamp('scheduled_for').defaultNow(),
  expiresAt: timestamp('expires_at'),
  status: varchar('status', { length: 50 }).default('pending'),
  attempts: integer('attempts').default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  sentAt: timestamp('sent_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});


export const userNotificationPreferences = pgTable('user_notification_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  channel: varchar('channel', { length: 50 }).notNull(),
  triggerCode: varchar('trigger_code', { length: 100 }),
  enabled: boolean('enabled').default(true),
  frequencyCapOverride: integer('frequency_cap_override'),
  quietHoursStart: time('quiet_hours_start'),
  quietHoursEnd: time('quiet_hours_end'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const notificationBatch = pgTable('notification_batch', {
  id: serial('id').primaryKey(),
  batchKey: varchar('batch_key', { length: 255 }).unique().notNull(),
  channel: varchar('channel', { length: 50 }).notNull(),
  scheduledFor: timestamp('scheduled_for'),
  notificationIds: integer('notification_ids').array(),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  processedAt: timestamp('processed_at')
});

// Notification Zod schemas
export const insertNotificationTemplatesSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertNotificationTemplates = z.infer<typeof insertNotificationTemplatesSchema>;
export type NotificationTemplates = typeof notificationTemplates.$inferSelect;

export const insertNotificationQueueSchema = createInsertSchema(notificationQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertNotificationQueue = z.infer<typeof insertNotificationQueueSchema>;
export type NotificationQueue = typeof notificationQueue.$inferSelect;

export const insertNotificationAuditLogSchema = createInsertSchema(notificationAuditLog).omit({
  id: true,
  timestamp: true
});
export type InsertNotificationAuditLog = z.infer<typeof insertNotificationAuditLogSchema>;
export type NotificationAuditLog = typeof notificationAuditLog.$inferSelect;

export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;
export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;

export const insertNotificationBatchSchema = createInsertSchema(notificationBatch).omit({
  id: true,
  createdAt: true,
  processedAt: true
});
export type InsertNotificationBatch = z.infer<typeof insertNotificationBatchSchema>;
export type NotificationBatch = typeof notificationBatch.$inferSelect;