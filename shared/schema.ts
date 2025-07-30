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

// User storage table - normalized with structured name fields only
export const users = pgTable("users", {
  id: integer("id").primaryKey(), // Use integer to match actual database
  email: varchar("email").unique(),
  title: varchar("title"), // Dr., M., Mme., etc.
  firstName: varchar("first_name"), // Structured first name
  lastName: varchar("last_name"), // Structured last name  
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
  id: integer("id").primaryKey(), // Integer ID as in actual database
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
  doctorId: uuid("doctor_id").notNull(), // Remove foreign key reference that's causing type mismatch
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isAvailable: boolean("is_available").default(true),
  lockedUntil: timestamp("locked_until"),
  lockedBy: varchar("locked_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pending appointments (for analytics/audit)
export const appointmentPending = pgTable("appointment_pending", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").references(() => doctors.id).notNull(),
  slotId: uuid("slot_id").references(() => doctorTimeSlots.id).notNull(),
  sessionId: varchar("session_id").notNull(),
  lockedUntil: timestamp("locked_until").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: varchar("patient_id").references(() => users.id).notNull(),
  doctorId: uuid("doctor_id").references(() => doctors.id).notNull(),
  timeSlotId: uuid("time_slot_id").references(() => doctorTimeSlots.id),
  appointmentDate: timestamp("appointment_date").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, confirmed, paid, completed, cancelled
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  paymentIntentId: varchar("payment_intent_id"),
  notes: text("notes"),
  prescription: text("prescription"),
  rescheduleCount: integer("reschedule_count").default(0),
  cancelReason: text("cancel_reason"), // Reason for cancellation
  cancelledBy: varchar("cancelled_by"), // patient, doctor, admin
  videoRoomId: varchar("video_room_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointment changes tracking
export const appointmentChanges = pgTable("appointment_changes", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }).notNull(),
  action: varchar("action").notNull(), // reschedule, cancel
  actorRole: varchar("actor_role"),
  reason: text("reason"),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews and ratings
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").references(() => appointments.id).notNull(),
  patientId: varchar("patient_id").references(() => users.id).notNull(),
  doctorId: uuid("doctor_id").references(() => doctors.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

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