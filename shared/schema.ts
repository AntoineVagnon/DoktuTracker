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

// GDPR Data Processing Records
export const gdprDataProcessingRecords = pgTable("gdpr_data_processing_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  processingPurpose: varchar("processing_purpose").notNull(),
  legalBasis: varchar("legal_basis").notNull(),
  dataCategories: jsonb("data_categories").notNull(),
  retentionPeriod: varchar("retention_period").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

// User notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  emailEnabled: boolean("email_enabled").default(true),
  smsEnabled: boolean("sms_enabled").default(false),
  pushEnabled: boolean("push_enabled").default(false),
  marketingEmailsEnabled: boolean("marketing_emails_enabled").default(true),
  reminderTiming: jsonb("reminder_timing"), // Custom reminder preferences
  locale: varchar("locale").default("en"), // Language preference
  timezone: varchar("timezone").default("Europe/Paris"),
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