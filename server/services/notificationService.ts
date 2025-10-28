import { db } from "../db";
import { 
  notificationTemplates,
  notificationQueue,
  notificationAuditLog,
  userNotificationPreferences,
  notificationPreferences,
  notificationFrequencyTracking,
  notificationBatch,
  emailNotifications,
  smsNotifications,
  pushNotifications,
  inAppNotifications,
  appointments,
  users,
  doctors
} from "@shared/schema";
import { eq, and, lte, or, isNull, desc, gte, sql } from "drizzle-orm";
import { format, addHours, addMinutes, subHours, subMinutes, startOfWeek, isWithinInterval, parse } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { sendEmail } from "./emailService";
import { createICSAttachment } from "./calendarService";
import { getEmailTemplate } from "./emailTemplates";

// Complete trigger codes from PRD Universal Notification System
export enum TriggerCode {
  // Account & Security (A1-A6)
  ACCOUNT_REG_SUCCESS = "A1", // Registration success
  ACCOUNT_EMAIL_VERIFY = "A2", // Email verification
  ACCOUNT_PASSWORD_RESET = "A3", // Password reset requested
  ACCOUNT_PASSWORD_CHANGED = "A4", // Password changed
  ACCOUNT_NEW_DEVICE = "A5", // New device/session
  ACCOUNT_MFA_UPDATED = "A6", // MFA setup/removed

  // Health Profile & Documents (H1-H5)
  HEALTH_PROFILE_INCOMPLETE = "H1", // Health profile incomplete
  HEALTH_PROFILE_COMPLETED = "H2", // Health profile completed
  HEALTH_DOC_PATIENT_UPLOADED = "H3", // Patient uploads doc to appointment
  HEALTH_DOC_DOCTOR_SHARED = "H4", // Doctor shares doc with patient
  HEALTH_DOC_UPLOAD_FAILED = "H5", // Doc upload failed/virus flagged

  // Booking & Appointment Lifecycle (B1-B12)
  BOOKING_PAYMENT_PENDING = "B1", // Slot selected, payment pending (15-min hold)
  BOOKING_HOLD_EXPIRED = "B2", // Hold expired (no payment)
  BOOKING_CONFIRMED = "B3", // Booking confirmed (paid or covered)
  BOOKING_REMINDER_24H = "B4", // 24-hour reminder
  BOOKING_REMINDER_1H = "B5", // 1-hour reminder
  BOOKING_LIVE_IMMINENT = "B6", // Live/imminent (≤5 min)
  BOOKING_RESCHEDULED = "B7", // Rescheduled
  BOOKING_CANCELLED_PATIENT_EARLY = "B8", // Cancelled by patient (≥60 min)
  BOOKING_CANCELLED_PATIENT_LATE = "B9", // Cancelled by patient (<60 min)
  BOOKING_CANCELLED_DOCTOR = "B10", // Cancelled by doctor
  BOOKING_DOCTOR_NO_SHOW = "B11", // Doctor no-show flag
  BOOKING_PATIENT_NO_SHOW = "B12", // Patient no-show flag

  // Payments & Membership (M1-M10, P1-P2)
  MEMBERSHIP_ACTIVATED = "M1", // Membership activated
  MEMBERSHIP_RENEWAL_UPCOMING = "M2", // Membership renewal upcoming
  MEMBERSHIP_RENEWED = "M3", // Membership renewed (success)
  MEMBERSHIP_PAYMENT_FAILED_1 = "M4", // Membership payment failed (1)
  MEMBERSHIP_SUSPENDED = "M5", // Membership suspended (fail 2)
  MEMBERSHIP_CANCELLED = "M6", // Membership cancelled by user
  MEMBERSHIP_REACTIVATED = "M7", // Membership reactivated
  MEMBERSHIP_ALLOWANCE_1_LEFT = "M8", // Allowance 1 left
  MEMBERSHIP_ALLOWANCE_EXHAUSTED = "M9", // Allowance exhausted
  MEMBERSHIP_MONTHLY_RESET = "M10", // Monthly reset
  PAYMENT_RECEIPT = "P1", // Pay-per-visit receipt
  PAYMENT_REFUND_ISSUED = "P2", // Refund/credit issued

  // Calendar & Availability (C1-C2)
  CALENDAR_AVAILABILITY_UPDATED = "C1", // Availability edited (doctor)
  CALENDAR_CONFLICT_DETECTED = "C2", // Availability conflict detected

  // Growth & Lifecycle (G1-G12) - Future implementation
  GROWTH_ONBOARDING_WELCOME = "G1", // Welcome series start
  GROWTH_ONBOARDING_PROFILE = "G2", // Complete profile nudge
  GROWTH_FIRST_BOOKING_NUDGE = "G3", // First booking encouragement
  GROWTH_RE_ENGAGEMENT_30D = "G4", // 30-day re-engagement
  GROWTH_RE_ENGAGEMENT_90D = "G5", // 90-day re-engagement
  GROWTH_SURVEY_POST_CONSULTATION = "G6", // Post-consultation survey
  GROWTH_REFERRAL_PROGRAM = "G7", // Referral program invitation
  GROWTH_FEATURE_ANNOUNCEMENT = "G8", // New feature announcement
  GROWTH_SEASONAL_CAMPAIGN = "G9", // Seasonal health campaigns
  GROWTH_MEMBERSHIP_UPSELL = "G10", // Membership upsell to pay-per-visit users
  GROWTH_DOCTOR_RATING_REQUEST = "G11", // Doctor rating request
  GROWTH_APP_UPDATE_AVAILABLE = "G12", // App update available

  // Doctor Registration & Application Management (D1-D6)
  DOCTOR_APP_APPROVED = "D1", // Doctor application approved
  DOCTOR_APP_REJECTED_SOFT = "D2", // Doctor application rejected (soft - can reapply)
  DOCTOR_APP_REJECTED_HARD = "D3", // Doctor application rejected (hard - permanent)
  DOCTOR_ACCOUNT_SUSPENDED = "D4", // Doctor account suspended
  DOCTOR_ACCOUNT_REACTIVATED = "D5", // Doctor account reactivated
  DOCTOR_PROFILE_ACTIVATION_COMPLETE = "D6", // Doctor profile 100% complete and activated

  // Legacy support
  BOOK_CONF = "B3", // Legacy mapping
  REM_24H = "B4", // Legacy mapping
  REM_1H_DOC = "B5", // Legacy mapping
  REM_10M_DOC = "B5", // Legacy mapping
  REM_5M_PAT = "B6", // Legacy mapping
  RESCHED = "B7", // Legacy mapping
  CANCEL = "B10", // Legacy mapping
  SURVEY = "G6", // Legacy mapping
  NO_SHOW = "B11", // Legacy mapping
  FREE_CREDIT = "P2", // Legacy mapping
  PROFILE_NEEDED = "H1" // Legacy mapping
}

// Priority mapping from PRD (highest → lowest): Blocking/Compliance, Time-critical, Operational, Lifecycle/Growth
const TRIGGER_PRIORITY: Record<TriggerCode, number> = {
  // Blocking/Compliance (100-90) - Payment incomplete, security alerts
  [TriggerCode.BOOKING_PAYMENT_PENDING]: 100,
  [TriggerCode.MEMBERSHIP_PAYMENT_FAILED_1]: 95,
  [TriggerCode.MEMBERSHIP_SUSPENDED]: 94,
  [TriggerCode.ACCOUNT_PASSWORD_CHANGED]: 93,
  [TriggerCode.ACCOUNT_NEW_DEVICE]: 92,
  [TriggerCode.CALENDAR_CONFLICT_DETECTED]: 91,
  [TriggerCode.ACCOUNT_MFA_UPDATED]: 90,

  // Time-critical (89-70) - Live/starting ≤ 5 min; 1h/24h reminders
  [TriggerCode.BOOKING_LIVE_IMMINENT]: 89,
  [TriggerCode.BOOKING_REMINDER_1H]: 85,
  [TriggerCode.BOOKING_REMINDER_24H]: 80,
  [TriggerCode.BOOKING_DOCTOR_NO_SHOW]: 78,
  [TriggerCode.BOOKING_PATIENT_NO_SHOW]: 77,
  [TriggerCode.BOOKING_CANCELLED_DOCTOR]: 75,
  [TriggerCode.MEMBERSHIP_RENEWAL_UPCOMING]: 72,
  [TriggerCode.BOOKING_HOLD_EXPIRED]: 70,

  // Operational (69-40) - Confirmations, reschedules, cancellations
  [TriggerCode.BOOKING_CONFIRMED]: 65,
  [TriggerCode.MEMBERSHIP_ACTIVATED]: 63,
  [TriggerCode.MEMBERSHIP_RENEWED]: 62,
  [TriggerCode.MEMBERSHIP_REACTIVATED]: 61,
  [TriggerCode.BOOKING_RESCHEDULED]: 60,
  [TriggerCode.PAYMENT_RECEIPT]: 58,
  [TriggerCode.PAYMENT_REFUND_ISSUED]: 57,
  [TriggerCode.BOOKING_CANCELLED_PATIENT_EARLY]: 55,
  [TriggerCode.BOOKING_CANCELLED_PATIENT_LATE]: 54,
  [TriggerCode.HEALTH_DOC_DOCTOR_SHARED]: 52,
  [TriggerCode.HEALTH_DOC_PATIENT_UPLOADED]: 51,
  [TriggerCode.HEALTH_PROFILE_COMPLETED]: 50,
  [TriggerCode.ACCOUNT_REG_SUCCESS]: 48,
  [TriggerCode.ACCOUNT_EMAIL_VERIFY]: 47,
  [TriggerCode.ACCOUNT_PASSWORD_RESET]: 46,
  [TriggerCode.MEMBERSHIP_CANCELLED]: 45,
  [TriggerCode.CALENDAR_AVAILABILITY_UPDATED]: 42,
  [TriggerCode.HEALTH_DOC_UPLOAD_FAILED]: 40,

  // Lifecycle/Growth (39-10) - Onboarding, re-engagement, surveys, referrals
  [TriggerCode.MEMBERSHIP_ALLOWANCE_1_LEFT]: 35,
  [TriggerCode.MEMBERSHIP_ALLOWANCE_EXHAUSTED]: 34,
  [TriggerCode.MEMBERSHIP_MONTHLY_RESET]: 33,
  [TriggerCode.GROWTH_SURVEY_POST_CONSULTATION]: 30,
  [TriggerCode.HEALTH_PROFILE_INCOMPLETE]: 28,
  [TriggerCode.GROWTH_ONBOARDING_WELCOME]: 25,
  [TriggerCode.GROWTH_ONBOARDING_PROFILE]: 24,
  [TriggerCode.GROWTH_FIRST_BOOKING_NUDGE]: 23,
  [TriggerCode.GROWTH_MEMBERSHIP_UPSELL]: 22,
  [TriggerCode.GROWTH_DOCTOR_RATING_REQUEST]: 20,
  [TriggerCode.GROWTH_RE_ENGAGEMENT_30D]: 18,
  [TriggerCode.GROWTH_RE_ENGAGEMENT_90D]: 17,
  [TriggerCode.GROWTH_REFERRAL_PROGRAM]: 15,
  [TriggerCode.GROWTH_FEATURE_ANNOUNCEMENT]: 13,
  [TriggerCode.GROWTH_SEASONAL_CAMPAIGN]: 12,
  [TriggerCode.GROWTH_APP_UPDATE_AVAILABLE]: 10,

  // Doctor Registration & Account Management (56-49) - Operational priority
  [TriggerCode.DOCTOR_ACCOUNT_SUSPENDED]: 56, // Higher than normal operational (suspension is critical)
  [TriggerCode.DOCTOR_APP_REJECTED_HARD]: 53, // Important rejection notification
  [TriggerCode.DOCTOR_APP_REJECTED_SOFT]: 52, // Important rejection notification
  [TriggerCode.DOCTOR_APP_APPROVED]: 51, // Good news, important operational
  [TriggerCode.DOCTOR_ACCOUNT_REACTIVATED]: 50, // Good news, operational
  [TriggerCode.DOCTOR_PROFILE_ACTIVATION_COMPLETE]: 49 // Profile complete and activated
};

// Template key mapping - maps trigger codes to email template identifiers
const TRIGGER_TEMPLATES: Record<TriggerCode, string> = {
  // Account & Security
  [TriggerCode.ACCOUNT_REG_SUCCESS]: "account_registration_success",
  [TriggerCode.ACCOUNT_EMAIL_VERIFY]: "account_email_verification",
  [TriggerCode.ACCOUNT_PASSWORD_RESET]: "account_password_reset",
  [TriggerCode.ACCOUNT_PASSWORD_CHANGED]: "account_password_changed",
  [TriggerCode.ACCOUNT_NEW_DEVICE]: "account_new_device_login",
  [TriggerCode.ACCOUNT_MFA_UPDATED]: "account_mfa_updated",

  // Health Profile & Documents
  [TriggerCode.HEALTH_PROFILE_INCOMPLETE]: "health_profile_incomplete",
  [TriggerCode.HEALTH_PROFILE_COMPLETED]: "health_profile_completed",
  [TriggerCode.HEALTH_DOC_PATIENT_UPLOADED]: "health_doc_patient_uploaded",
  [TriggerCode.HEALTH_DOC_DOCTOR_SHARED]: "health_doc_doctor_shared",
  [TriggerCode.HEALTH_DOC_UPLOAD_FAILED]: "health_doc_upload_failed",

  // Booking & Appointments
  [TriggerCode.BOOKING_PAYMENT_PENDING]: "booking_payment_pending",
  [TriggerCode.BOOKING_HOLD_EXPIRED]: "booking_hold_expired",
  [TriggerCode.BOOKING_CONFIRMED]: "booking_confirmation",
  [TriggerCode.BOOKING_REMINDER_24H]: "booking_reminder_24h",
  [TriggerCode.BOOKING_REMINDER_1H]: "booking_reminder_1h",
  [TriggerCode.BOOKING_LIVE_IMMINENT]: "booking_live_imminent",
  [TriggerCode.BOOKING_RESCHEDULED]: "booking_rescheduled",
  [TriggerCode.BOOKING_CANCELLED_PATIENT_EARLY]: "booking_cancelled_patient_early",
  [TriggerCode.BOOKING_CANCELLED_PATIENT_LATE]: "booking_cancelled_patient_late",
  [TriggerCode.BOOKING_CANCELLED_DOCTOR]: "booking_cancelled_doctor",
  [TriggerCode.BOOKING_DOCTOR_NO_SHOW]: "booking_doctor_no_show",
  [TriggerCode.BOOKING_PATIENT_NO_SHOW]: "booking_patient_no_show",

  // Membership & Payments
  [TriggerCode.MEMBERSHIP_ACTIVATED]: "membership_activated",
  [TriggerCode.MEMBERSHIP_RENEWAL_UPCOMING]: "membership_renewal_upcoming",
  [TriggerCode.MEMBERSHIP_RENEWED]: "membership_renewed",
  [TriggerCode.MEMBERSHIP_PAYMENT_FAILED_1]: "membership_payment_failed",
  [TriggerCode.MEMBERSHIP_SUSPENDED]: "membership_suspended",
  [TriggerCode.MEMBERSHIP_CANCELLED]: "membership_cancelled",
  [TriggerCode.MEMBERSHIP_REACTIVATED]: "membership_reactivated",
  [TriggerCode.MEMBERSHIP_ALLOWANCE_1_LEFT]: "membership_allowance_1_left",
  [TriggerCode.MEMBERSHIP_ALLOWANCE_EXHAUSTED]: "membership_allowance_exhausted",
  [TriggerCode.MEMBERSHIP_MONTHLY_RESET]: "membership_monthly_reset",
  [TriggerCode.PAYMENT_RECEIPT]: "payment_receipt",
  [TriggerCode.PAYMENT_REFUND_ISSUED]: "payment_refund_issued",

  // Calendar & Availability
  [TriggerCode.CALENDAR_AVAILABILITY_UPDATED]: "calendar_availability_updated",
  [TriggerCode.CALENDAR_CONFLICT_DETECTED]: "calendar_conflict_detected",

  // Growth & Lifecycle
  [TriggerCode.GROWTH_ONBOARDING_WELCOME]: "growth_onboarding_welcome",
  [TriggerCode.GROWTH_ONBOARDING_PROFILE]: "growth_onboarding_profile",
  [TriggerCode.GROWTH_FIRST_BOOKING_NUDGE]: "growth_first_booking_nudge",
  [TriggerCode.GROWTH_RE_ENGAGEMENT_30D]: "growth_re_engagement_30d",
  [TriggerCode.GROWTH_RE_ENGAGEMENT_90D]: "growth_re_engagement_90d",
  [TriggerCode.GROWTH_SURVEY_POST_CONSULTATION]: "growth_survey_post_consultation",
  [TriggerCode.GROWTH_REFERRAL_PROGRAM]: "growth_referral_program",
  [TriggerCode.GROWTH_FEATURE_ANNOUNCEMENT]: "growth_feature_announcement",
  [TriggerCode.GROWTH_SEASONAL_CAMPAIGN]: "growth_seasonal_campaign",
  [TriggerCode.GROWTH_MEMBERSHIP_UPSELL]: "growth_membership_upsell",
  [TriggerCode.GROWTH_DOCTOR_RATING_REQUEST]: "growth_doctor_rating_request",
  [TriggerCode.GROWTH_APP_UPDATE_AVAILABLE]: "growth_app_update_available",

  // Doctor Registration & Account Management
  [TriggerCode.DOCTOR_APP_APPROVED]: "doctor_application_approved",
  [TriggerCode.DOCTOR_APP_REJECTED_SOFT]: "doctor_application_rejected_soft",
  [TriggerCode.DOCTOR_APP_REJECTED_HARD]: "doctor_application_rejected_hard",
  [TriggerCode.DOCTOR_ACCOUNT_SUSPENDED]: "doctor_account_suspended",
  [TriggerCode.DOCTOR_ACCOUNT_REACTIVATED]: "doctor_account_reactivated",
  [TriggerCode.DOCTOR_PROFILE_ACTIVATION_COMPLETE]: "doctor_profile_activated"
};

// Category mapping for notification preferences
const TRIGGER_CATEGORIES: Record<TriggerCode, string> = {
  // Security & Transactional (cannot be disabled)
  [TriggerCode.ACCOUNT_PASSWORD_CHANGED]: "security",
  [TriggerCode.ACCOUNT_NEW_DEVICE]: "security",
  [TriggerCode.ACCOUNT_MFA_UPDATED]: "security",
  [TriggerCode.ACCOUNT_REG_SUCCESS]: "transactional",
  [TriggerCode.ACCOUNT_EMAIL_VERIFY]: "transactional",
  [TriggerCode.ACCOUNT_PASSWORD_RESET]: "transactional",

  // Appointment-related
  [TriggerCode.BOOKING_PAYMENT_PENDING]: "transactional",
  [TriggerCode.BOOKING_CONFIRMED]: "transactional",
  [TriggerCode.BOOKING_RESCHEDULED]: "transactional",
  [TriggerCode.BOOKING_CANCELLED_PATIENT_EARLY]: "transactional",
  [TriggerCode.BOOKING_CANCELLED_PATIENT_LATE]: "transactional",
  [TriggerCode.BOOKING_CANCELLED_DOCTOR]: "transactional",
  [TriggerCode.BOOKING_REMINDER_24H]: "appointment_reminders",
  [TriggerCode.BOOKING_REMINDER_1H]: "appointment_reminders",
  [TriggerCode.BOOKING_LIVE_IMMINENT]: "appointment_reminders",
  [TriggerCode.BOOKING_HOLD_EXPIRED]: "appointment_reminders",
  [TriggerCode.BOOKING_DOCTOR_NO_SHOW]: "transactional",
  [TriggerCode.BOOKING_PATIENT_NO_SHOW]: "transactional",

  // Health Profile & Documents
  [TriggerCode.HEALTH_PROFILE_INCOMPLETE]: "document_notifications",
  [TriggerCode.HEALTH_PROFILE_COMPLETED]: "document_notifications",
  [TriggerCode.HEALTH_DOC_PATIENT_UPLOADED]: "document_notifications",
  [TriggerCode.HEALTH_DOC_DOCTOR_SHARED]: "document_notifications",
  [TriggerCode.HEALTH_DOC_UPLOAD_FAILED]: "document_notifications",

  // Membership
  [TriggerCode.MEMBERSHIP_ACTIVATED]: "membership_notifications",
  [TriggerCode.MEMBERSHIP_RENEWAL_UPCOMING]: "membership_notifications",
  [TriggerCode.MEMBERSHIP_RENEWED]: "membership_notifications",
  [TriggerCode.MEMBERSHIP_PAYMENT_FAILED_1]: "membership_notifications",
  [TriggerCode.MEMBERSHIP_SUSPENDED]: "membership_notifications",
  [TriggerCode.MEMBERSHIP_CANCELLED]: "membership_notifications",
  [TriggerCode.MEMBERSHIP_REACTIVATED]: "membership_notifications",
  [TriggerCode.MEMBERSHIP_ALLOWANCE_1_LEFT]: "membership_notifications",
  [TriggerCode.MEMBERSHIP_ALLOWANCE_EXHAUSTED]: "membership_notifications",
  [TriggerCode.MEMBERSHIP_MONTHLY_RESET]: "membership_notifications",

  // Payments
  [TriggerCode.PAYMENT_RECEIPT]: "transactional",
  [TriggerCode.PAYMENT_REFUND_ISSUED]: "transactional",

  // Calendar
  [TriggerCode.CALENDAR_AVAILABILITY_UPDATED]: "transactional",
  [TriggerCode.CALENDAR_CONFLICT_DETECTED]: "transactional",

  // Growth & Lifecycle
  [TriggerCode.GROWTH_ONBOARDING_WELCOME]: "life_cycle",
  [TriggerCode.GROWTH_ONBOARDING_PROFILE]: "life_cycle",
  [TriggerCode.GROWTH_FIRST_BOOKING_NUDGE]: "life_cycle",
  [TriggerCode.GROWTH_RE_ENGAGEMENT_30D]: "marketing_emails",
  [TriggerCode.GROWTH_RE_ENGAGEMENT_90D]: "marketing_emails",
  [TriggerCode.GROWTH_SURVEY_POST_CONSULTATION]: "life_cycle",
  [TriggerCode.GROWTH_REFERRAL_PROGRAM]: "marketing_emails",
  [TriggerCode.GROWTH_FEATURE_ANNOUNCEMENT]: "marketing_emails",
  [TriggerCode.GROWTH_SEASONAL_CAMPAIGN]: "marketing_emails",
  [TriggerCode.GROWTH_MEMBERSHIP_UPSELL]: "marketing_emails",
  [TriggerCode.GROWTH_DOCTOR_RATING_REQUEST]: "life_cycle",
  [TriggerCode.GROWTH_APP_UPDATE_AVAILABLE]: "life_cycle",

  // Doctor Registration & Account Management (transactional - cannot be disabled)
  [TriggerCode.DOCTOR_APP_APPROVED]: "transactional",
  [TriggerCode.DOCTOR_APP_REJECTED_SOFT]: "transactional",
  [TriggerCode.DOCTOR_APP_REJECTED_HARD]: "transactional",
  [TriggerCode.DOCTOR_ACCOUNT_SUSPENDED]: "transactional",
  [TriggerCode.DOCTOR_ACCOUNT_REACTIVATED]: "transactional",
  [TriggerCode.DOCTOR_PROFILE_ACTIVATION_COMPLETE]: "transactional"
};

// In-app notification configuration (which triggers should show banners/inbox)
const IN_APP_NOTIFICATION_CONFIG: Record<TriggerCode, { banner: boolean; inbox: boolean; style: string; persistent: boolean }> = {
  // High priority banners (persistent)
  [TriggerCode.BOOKING_PAYMENT_PENDING]: { banner: true, inbox: true, style: "urgent", persistent: true },
  [TriggerCode.MEMBERSHIP_PAYMENT_FAILED_1]: { banner: true, inbox: true, style: "error", persistent: true },
  [TriggerCode.MEMBERSHIP_SUSPENDED]: { banner: true, inbox: true, style: "error", persistent: true },
  [TriggerCode.BOOKING_LIVE_IMMINENT]: { banner: true, inbox: false, style: "urgent", persistent: true },
  [TriggerCode.ACCOUNT_PASSWORD_CHANGED]: { banner: true, inbox: true, style: "warning", persistent: false },
  [TriggerCode.ACCOUNT_NEW_DEVICE]: { banner: true, inbox: true, style: "warning", persistent: false },

  // Success notifications (auto-dismiss)
  [TriggerCode.BOOKING_CONFIRMED]: { banner: true, inbox: true, style: "success", persistent: false },
  [TriggerCode.MEMBERSHIP_ACTIVATED]: { banner: true, inbox: true, style: "success", persistent: false },
  [TriggerCode.HEALTH_PROFILE_COMPLETED]: { banner: true, inbox: true, style: "success", persistent: false },
  [TriggerCode.ACCOUNT_REG_SUCCESS]: { banner: true, inbox: true, style: "success", persistent: false },

  // Info notifications (inbox only or gentle banners)
  [TriggerCode.HEALTH_DOC_DOCTOR_SHARED]: { banner: true, inbox: true, style: "info", persistent: false },
  [TriggerCode.HEALTH_DOC_PATIENT_UPLOADED]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.MEMBERSHIP_ALLOWANCE_1_LEFT]: { banner: true, inbox: true, style: "warning", persistent: false },
  [TriggerCode.MEMBERSHIP_ALLOWANCE_EXHAUSTED]: { banner: true, inbox: true, style: "warning", persistent: false },
  [TriggerCode.HEALTH_PROFILE_INCOMPLETE]: { banner: true, inbox: true, style: "info", persistent: false },

  // Appointment changes
  [TriggerCode.BOOKING_RESCHEDULED]: { banner: true, inbox: true, style: "info", persistent: false },
  [TriggerCode.BOOKING_CANCELLED_DOCTOR]: { banner: true, inbox: true, style: "warning", persistent: false },

  // Default: inbox only for most lifecycle/growth notifications
  [TriggerCode.GROWTH_ONBOARDING_WELCOME]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_ONBOARDING_PROFILE]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_FIRST_BOOKING_NUDGE]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_RE_ENGAGEMENT_30D]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_RE_ENGAGEMENT_90D]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_SURVEY_POST_CONSULTATION]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_REFERRAL_PROGRAM]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_FEATURE_ANNOUNCEMENT]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_SEASONAL_CAMPAIGN]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_MEMBERSHIP_UPSELL]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_DOCTOR_RATING_REQUEST]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.GROWTH_APP_UPDATE_AVAILABLE]: { banner: false, inbox: true, style: "info", persistent: false },

  // Account & Security (missing ones)
  [TriggerCode.ACCOUNT_EMAIL_VERIFY]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.ACCOUNT_PASSWORD_RESET]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.ACCOUNT_MFA_UPDATED]: { banner: true, inbox: true, style: "info", persistent: false },

  // Health Profile & Documents (missing ones)
  [TriggerCode.HEALTH_DOC_UPLOAD_FAILED]: { banner: true, inbox: true, style: "error", persistent: false },

  // Booking & Appointments (missing ones)
  [TriggerCode.BOOKING_HOLD_EXPIRED]: { banner: true, inbox: true, style: "warning", persistent: false },
  [TriggerCode.BOOKING_REMINDER_24H]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.BOOKING_REMINDER_1H]: { banner: true, inbox: true, style: "info", persistent: false },
  [TriggerCode.BOOKING_CANCELLED_PATIENT_EARLY]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.BOOKING_CANCELLED_PATIENT_LATE]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.BOOKING_DOCTOR_NO_SHOW]: { banner: true, inbox: true, style: "error", persistent: false },
  [TriggerCode.BOOKING_PATIENT_NO_SHOW]: { banner: true, inbox: true, style: "warning", persistent: false },

  // Membership & Payments (missing ones)
  [TriggerCode.MEMBERSHIP_RENEWAL_UPCOMING]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.MEMBERSHIP_RENEWED]: { banner: true, inbox: true, style: "success", persistent: false },
  [TriggerCode.MEMBERSHIP_CANCELLED]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.MEMBERSHIP_REACTIVATED]: { banner: true, inbox: true, style: "success", persistent: false },
  [TriggerCode.MEMBERSHIP_MONTHLY_RESET]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.PAYMENT_RECEIPT]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.PAYMENT_REFUND_ISSUED]: { banner: true, inbox: true, style: "success", persistent: false },

  // Calendar & Availability (missing ones)
  [TriggerCode.CALENDAR_AVAILABILITY_UPDATED]: { banner: false, inbox: true, style: "info", persistent: false },
  [TriggerCode.CALENDAR_CONFLICT_DETECTED]: { banner: true, inbox: true, style: "warning", persistent: false },

  // Doctor Registration & Account Management
  [TriggerCode.DOCTOR_APP_APPROVED]: { banner: true, inbox: true, style: "success", persistent: false },
  [TriggerCode.DOCTOR_APP_REJECTED_SOFT]: { banner: true, inbox: true, style: "warning", persistent: false },
  [TriggerCode.DOCTOR_APP_REJECTED_HARD]: { banner: true, inbox: true, style: "error", persistent: false },
  [TriggerCode.DOCTOR_ACCOUNT_SUSPENDED]: { banner: true, inbox: true, style: "error", persistent: true },
  [TriggerCode.DOCTOR_ACCOUNT_REACTIVATED]: { banner: true, inbox: true, style: "success", persistent: false },
  [TriggerCode.DOCTOR_PROFILE_ACTIVATION_COMPLETE]: { banner: true, inbox: true, style: "success", persistent: false }
};

export class UniversalNotificationService {
  /**
   * Main entry point: Schedule a notification with comprehensive validation and routing
   */
  async scheduleNotification(params: {
    userId: number;
    appointmentId?: number;
    triggerCode: TriggerCode;
    scheduledFor?: Date;
    mergeData?: Record<string, any>;
    metadata?: Record<string, any>;
    userContext?: {
      ipAddress?: string;
      userAgent?: string;
    };
  }) {
    const { 
      userId, 
      appointmentId, 
      triggerCode, 
      scheduledFor = new Date(), 
      mergeData = {}, 
      metadata = {},
      userContext = {}
    } = params;
    
    try {
      console.log(`📬 Scheduling notification: ${triggerCode} for user ${userId}`);
      
      // 1. Get user details and preferences
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.id, userId));
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      let [prefs] = await db
        .select({
          userId: userNotificationPreferences.userId,
          channel: userNotificationPreferences.channel,
          enabled: userNotificationPreferences.enabled
        })
        .from(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, userId));

      // Create default preferences if not exists
      if (!prefs) {
        await db.insert(userNotificationPreferences).values({ 
          userId,
          channel: 'email',
          enabled: true 
        });
        [prefs] = await db
          .select({
            userId: userNotificationPreferences.userId,
            channel: userNotificationPreferences.channel,
            enabled: userNotificationPreferences.enabled
          })
          .from(userNotificationPreferences)
          .where(eq(userNotificationPreferences.userId, userId));
      }

      // Transform user preferences from DB structure to expected format
      const transformedPrefs = {
        emailEnabled: prefs.channel === 'email' && prefs.enabled,
        smsEnabled: prefs.channel === 'sms' && prefs.enabled,
        pushEnabled: prefs.channel === 'push' && prefs.enabled,
        appointmentRemindersEnabled: prefs.enabled !== false, // Default to true for transactional
        documentNotificationsEnabled: prefs.enabled !== false,
        membershipNotificationsEnabled: prefs.enabled !== false,
        marketingEmailsEnabled: false, // Default to false for marketing
        lifeCycleEnabled: prefs.enabled !== false,
        timezone: "Europe/Paris", // Default timezone for EU telehealth platform
        locale: "en" // Default locale
      };
      
      console.log(`📋 User ${userId} preferences:`, transformedPrefs);

      // 2. Check if notification is enabled for this category
      const category = TRIGGER_CATEGORIES[triggerCode];
      if (!this.isNotificationEnabled(triggerCode, category, transformedPrefs)) {
        console.log(`🔕 Notification ${triggerCode} disabled for user ${userId} (category: ${category})`);
        await this.logAuditEvent({
          userId,
          appointmentId,
          eventType: "suppressed",
          channel: "policy",
          triggerCode,
          details: { reason: "category_disabled", category },
          userContext
        });
        return;
      }

      // 3. Check for duplicate notifications (within 30 minutes)
      const isDuplicate = await this.checkDuplicateNotification(userId, appointmentId, triggerCode);
      if (isDuplicate) {
        console.log(`🔁 Duplicate notification prevented for user ${userId}, trigger ${triggerCode}`);
        await this.logAuditEvent({
          userId,
          appointmentId,
          eventType: "suppressed",
          channel: "system",
          triggerCode,
          details: { reason: "duplicate_protection" },
          userContext
        });
        return;
      }

      // 4. Apply timezone-aware scheduling and quiet hours
      const adjustedScheduledFor = await this.applyTimezoneAndQuietHours(scheduledFor, transformedPrefs, triggerCode);

      // 5. Check frequency caps
      const frequencyCheck = await this.checkFrequencyCaps(userId, triggerCode, category);
      if (!frequencyCheck.allowed) {
        console.log(`📊 Frequency cap exceeded for user ${userId}, trigger ${triggerCode}`);
        await this.logAuditEvent({
          userId,
          appointmentId,
          eventType: "suppressed",
          channel: "policy",
          triggerCode,
          details: { reason: "frequency_cap", ...frequencyCheck },
          userContext
        });
        return;
      }

      // 6. Check for suppression rules (priority-based)
      const suppressionCheck = await this.checkSuppressionRules(userId, triggerCode);
      if (suppressionCheck.suppressed) {
        console.log(`🚫 Notification ${triggerCode} suppressed by higher priority: ${suppressionCheck.suppressorTrigger}`);
        await this.logAuditEvent({
          userId,
          appointmentId,
          eventType: "suppressed",
          channel: "priority",
          triggerCode,
          details: { reason: "priority_suppression", ...suppressionCheck },
          userContext
        });
        return;
      }

      // 7. Determine channels based on trigger type and user preferences
      const channels = this.getChannelsForTrigger(triggerCode, transformedPrefs);
      
      // 8. Enhance merge data with user and system context
      const enhancedMergeData = await this.enhanceMergeData(mergeData, user, appointmentId, transformedPrefs);

      console.log(`📡 Scheduling channels for ${triggerCode}:`, {
        email: channels.email,
        sms: channels.sms,
        push: channels.push,
        inAppBanner: channels.inAppBanner,
        inAppInbox: channels.inAppInbox
      });

      // 9. Schedule notifications for each enabled channel
      const scheduledNotifications = [];

      if (channels.email && user.email) {
        const emailId = await this.scheduleEmailNotification({
          userId,
          appointmentId,
          triggerCode,
          templateKey: TRIGGER_TEMPLATES[triggerCode],
          scheduledFor: adjustedScheduledFor,
          priority: TRIGGER_PRIORITY[triggerCode],
          mergeData: enhancedMergeData,
          metadata: { ...metadata, originalScheduledFor: scheduledFor }
        });
        scheduledNotifications.push({ type: 'email', id: emailId });
      }

      // Note: SMS functionality requires phone numbers to be added to user schema
      // For now, skip SMS notifications as users table doesn't include phone numbers
      if (channels.sms && false) { // Disabled until phone numbers are added to schema
        const smsId = await this.scheduleSMSNotification({
          userId,
          appointmentId,
          triggerCode,
          templateKey: TRIGGER_TEMPLATES[triggerCode],
          scheduledFor: adjustedScheduledFor,
          phoneNumber: "", // Would use user.phone when available
          mergeData: enhancedMergeData
        });
        scheduledNotifications.push({ type: 'sms', id: smsId });
      }

      if (channels.push) {
        const pushId = await this.schedulePushNotification({
          userId,
          appointmentId,
          triggerCode,
          templateKey: TRIGGER_TEMPLATES[triggerCode],
          scheduledFor: adjustedScheduledFor,
          mergeData: enhancedMergeData
        });
        scheduledNotifications.push({ type: 'push', id: pushId });
      }

      if (channels.inAppBanner || channels.inAppInbox) {
        const inAppId = await this.scheduleInAppNotification({
          userId,
          appointmentId,
          triggerCode,
          scheduledFor: adjustedScheduledFor,
          mergeData: enhancedMergeData,
          channels: { banner: channels.inAppBanner, inbox: channels.inAppInbox }
        });
        scheduledNotifications.push({ type: 'in_app', id: inAppId });
      }

      // 10. Update frequency tracking
      await this.updateFrequencyTracking(userId, triggerCode, category);

      // 11. Log successful scheduling
      await this.logAuditEvent({
        userId,
        appointmentId,
        eventType: "scheduled",
        channel: "system",
        triggerCode,
        details: { 
          scheduledNotifications,
          channels,
          scheduledFor: adjustedScheduledFor,
          priority: TRIGGER_PRIORITY[triggerCode]
        },
        userContext
      });

      console.log(`✅ Successfully scheduled ${scheduledNotifications.length} notifications for ${triggerCode}`);
      
      // 🚀 IMMEDIATE PROCESSING: Process notifications immediately for better user experience
      // This eliminates the need for constant timer-based checking
      try {
        console.log(`🚀 Triggering immediate processing for ${triggerCode}`);
        await this.processPendingNotifications();
      } catch (processingError) {
        console.error(`⚠️ Immediate processing failed for ${triggerCode}, will retry later:`, processingError);
        // Don't fail the scheduling if immediate processing fails
      }
      
      return { success: true, scheduledNotifications };

    } catch (error: any) {
      console.error("❌ Error scheduling notification:", error);
      
      // Log error event
      await this.logAuditEvent({
        userId,
        appointmentId,
        eventType: "failed",
        channel: "system",
        triggerCode,
        details: { error: error.message },
        errorMessage: error.message,
        userContext
      });
      
      throw error;
    }
  }

  /**
   * Check if notification is enabled based on category preferences
   */
  private isNotificationEnabled(triggerCode: TriggerCode, category: string, prefs: any): boolean {
    // Security and transactional notifications cannot be disabled
    if (category === "security" || category === "transactional") {
      return true;
    }

    // Check category-specific preferences
    switch (category) {
      case "appointment_reminders":
        return prefs.appointmentRemindersEnabled;
      case "marketing_emails":
        return prefs.marketingEmailsEnabled;
      case "life_cycle":
        return prefs.lifeCycleEnabled;
      case "document_notifications":
        return prefs.documentNotificationsEnabled;
      case "membership_notifications":
        return prefs.membershipNotificationsEnabled;
      default:
        return true; // Default to enabled for unknown categories
    }
  }

  /**
   * Check for duplicate notifications within the last 30 minutes
   */
  private async checkDuplicateNotification(userId: number, appointmentId: number | undefined, triggerCode: TriggerCode): Promise<boolean> {
    const thirtyMinutesAgo = subMinutes(new Date(), 30);
    
    // Check notification queue for duplicate notifications
    // Include both 'pending' and 'failed' to prevent creating duplicates
    // while failed notifications are being retried
    const [existing] = await db
      .select({
        id: notificationQueue.id,
        status: notificationQueue.status
      })
      .from(notificationQueue)
      .where(and(
        eq(notificationQueue.userId, userId),
        eq(notificationQueue.triggerCode, triggerCode),
        gte(notificationQueue.createdAt, thirtyMinutesAgo),
        or(
          eq(notificationQueue.status, 'pending'),
          eq(notificationQueue.status, 'failed')
        )
      ));

    if (existing) {
      console.log('Duplicate notification prevented: found existing', existing.status, 'notification within 30 minutes');
    }
    return !!existing;
  }

  /**
   * Apply timezone-aware scheduling and enforce quiet hours
   */
  private async applyTimezoneAndQuietHours(scheduledFor: Date, prefs: any, triggerCode: TriggerCode): Promise<Date> {
    const userTimezone = prefs.timezone || "Europe/Paris";
    const quietStart = prefs.quietHoursStart || "22:00:00";
    const quietEnd = prefs.quietHoursEnd || "08:00:00";

    // Convert scheduled time to user's timezone
    const userTime = toZonedTime(scheduledFor, userTimezone);
    
    // Parse quiet hours
    const [quietStartHour, quietStartMinute] = quietStart.split(":").map(Number);
    const [quietEndHour, quietEndMinute] = quietEnd.split(":").map(Number);

    // Security/urgent notifications and critical account actions ignore quiet hours
    const priority = TRIGGER_PRIORITY[triggerCode];
    if (priority >= 90) { // Blocking/Compliance level
      return scheduledFor;
    }

    // Critical account notifications should always be sent immediately
    const immediateNotifications = [
      TriggerCode.ACCOUNT_REG_SUCCESS,
      TriggerCode.ACCOUNT_EMAIL_VERIFY,
      TriggerCode.ACCOUNT_PASSWORD_RESET,
      TriggerCode.ACCOUNT_PASSWORD_CHANGED,
      TriggerCode.DOCTOR_APP_APPROVED, // Doctor approval is a critical account status change
      TriggerCode.DOCTOR_APP_REJECTED_SOFT,
      TriggerCode.DOCTOR_APP_REJECTED_HARD,
      TriggerCode.BOOKING_CONFIRMED, // Booking confirmations should be immediate (healthcare 24/7)
      TriggerCode.BOOKING_REMINDER_24H, // Appointment reminders are time-critical
      TriggerCode.BOOKING_REMINDER_1H, // Must be sent exactly when scheduled
      TriggerCode.BOOKING_LIVE_IMMINENT, // 5-minute warning is urgent
    ];
    if (immediateNotifications.includes(triggerCode)) {
      return scheduledFor;
    }

    // Check if scheduled time falls within quiet hours
    const scheduledHour = userTime.getHours();
    const scheduledMinute = userTime.getMinutes();
    const scheduledTimeMinutes = scheduledHour * 60 + scheduledMinute;
    const quietStartMinutes = quietStartHour * 60 + quietStartMinute;
    const quietEndMinutes = quietEndHour * 60 + quietEndMinute;

    let isInQuietHours = false;
    
    if (quietStartMinutes > quietEndMinutes) {
      // Quiet hours cross midnight (e.g., 22:00 to 08:00)
      isInQuietHours = scheduledTimeMinutes >= quietStartMinutes || scheduledTimeMinutes <= quietEndMinutes;
    } else {
      // Quiet hours within same day
      isInQuietHours = scheduledTimeMinutes >= quietStartMinutes && scheduledTimeMinutes <= quietEndMinutes;
    }

    if (isInQuietHours) {
      // Move to end of quiet hours
      const endOfQuietHours = new Date(userTime);
      endOfQuietHours.setHours(quietEndHour, quietEndMinute, 0, 0);
      
      // If end of quiet hours is earlier than scheduled time (crosses midnight), add a day
      if (quietStartMinutes > quietEndMinutes && scheduledTimeMinutes >= quietStartMinutes) {
        endOfQuietHours.setDate(endOfQuietHours.getDate() + 1);
      }

      // Convert back to UTC
      return fromZonedTime(endOfQuietHours, userTimezone);
    }

    return scheduledFor;
  }

  /**
   * Check frequency caps for marketing and lifecycle notifications
   */
  private async checkFrequencyCaps(userId: number, triggerCode: TriggerCode, category: string): Promise<{ allowed: boolean; currentCount?: number; limit?: number }> {
    // Only apply frequency caps to marketing and lifecycle notifications
    if (category !== "marketing_emails" && category !== "life_cycle") {
      return { allowed: true };
    }

    // For now, allow all notifications while we implement full frequency tracking
    // TODO: Implement frequency tracking using notification_queue history
    return { allowed: true, currentCount: 0, limit: 10 };
  }

  /**
   * Check for active suppression rules based on priority
   */
  private async checkSuppressionRules(userId: number, triggerCode: TriggerCode): Promise<{ suppressed: boolean; suppressorTrigger?: string }> {
    // For now, don't suppress any notifications while we implement full suppression rules
    // TODO: Implement suppression rules using notification_queue history and priority levels
    return { suppressed: false };
  }

  /**
   * Determine notification channels based on trigger and preferences
   */
  private getChannelsForTrigger(triggerCode: TriggerCode, prefs: any) {
    const channels = {
      email: false,
      sms: false,
      push: false,
      inAppBanner: false,
      inAppInbox: false
    };

    const category = TRIGGER_CATEGORIES[triggerCode];
    const isEnabled = this.isNotificationEnabled(triggerCode, category, prefs);
    
    if (!isEnabled) {
      return channels;
    }

    // Email channel (most notifications)
    if (prefs.emailEnabled) {
      channels.email = ![
        TriggerCode.HEALTH_PROFILE_COMPLETED // In-app only
      ].includes(triggerCode);
    }

    // SMS channel (urgent/time-critical only)
    if (prefs.smsEnabled) {
      channels.sms = [
        TriggerCode.BOOKING_LIVE_IMMINENT,
        TriggerCode.BOOKING_REMINDER_1H,
        TriggerCode.MEMBERSHIP_PAYMENT_FAILED_1,
        TriggerCode.BOOKING_CANCELLED_DOCTOR
      ].includes(triggerCode);
    }

    // Push channel (reminders and urgent)
    if (prefs.pushEnabled) {
      channels.push = [
        TriggerCode.BOOKING_LIVE_IMMINENT,
        TriggerCode.BOOKING_REMINDER_1H,
        TriggerCode.BOOKING_REMINDER_24H,
        TriggerCode.MEMBERSHIP_PAYMENT_FAILED_1,
        TriggerCode.HEALTH_DOC_DOCTOR_SHARED
      ].includes(triggerCode);
    }

    // In-app notifications
    const inAppConfig = IN_APP_NOTIFICATION_CONFIG[triggerCode];
    if (inAppConfig) {
      channels.inAppBanner = inAppConfig.banner;
      channels.inAppInbox = inAppConfig.inbox;
    }

    return channels;
  }

  /**
   * Enhance merge data with user context and system information
   */
  private async enhanceMergeData(mergeData: Record<string, any>, user: any, appointmentId?: number, prefs?: any): Promise<Record<string, any>> {
    const enhanced: Record<string, any> = {
      ...mergeData,
      // User context (both new format and template-expected format)
      FirstName: user.firstName || user.username?.split(" ")[0] || "there",
      LastName: user.lastName || "",
      FullName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "User",
      Email: user.email,
      Phone: user.phone,
      
      // Template-expected field names
      patient_first_name: user.firstName || user.username?.split(" ")[0] || "there",
      patient_last_name: user.lastName || "",
      patient_full_name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "User",
      
      // System context
      PlatformName: "Doktu",
      SupportEmail: "support@doktu.com",
      SupportURL: "/support",
      DashboardURL: "/dashboard",
      SecurityURL: "/security",
      SessionsURL: "/account/sessions",
      
      // Timezone and locale
      UserTimezone: prefs?.timezone || "Europe/Paris",
      UserLocale: prefs?.locale || "en",
      
      // Dates formatted for user's timezone
      DateLocal: formatInTimeZone(new Date(), prefs?.timezone || "Europe/Paris", "EEEE, MMMM d, yyyy"),
      TimeLocal: formatInTimeZone(new Date(), prefs?.timezone || "Europe/Paris", "HH:mm"),
      DateTimeLocal: formatInTimeZone(new Date(), prefs?.timezone || "Europe/Paris", "EEEE, MMMM d, yyyy 'at' HH:mm")
    };

    // Add appointment-specific data if available
    if (appointmentId) {
      try {
        const [appointment] = await db
          .select({
            id: appointments.id,
            appointmentDate: appointments.appointmentDate,
            doctorId: appointments.doctorId,
            zoomMeetingId: appointments.zoomMeetingId,
            zoomJoinUrl: appointments.zoomJoinUrl
          })
          .from(appointments)
          .where(eq(appointments.id, appointmentId));

        if (appointment) {
          // Get doctor details
          const [doctor] = await db
            .select({
              firstName: users.firstName,
              lastName: users.lastName
            })
            .from(doctors)
            .innerJoin(users, eq(doctors.userId, users.id))
            .where(eq(doctors.id, appointment.doctorId));

          const appointmentDate = new Date(appointment.appointmentDate);
          const userTimezone = prefs?.timezone || "Europe/Paris";

          enhanced.AppointmentDate = formatInTimeZone(appointmentDate, userTimezone, "EEEE, MMMM d, yyyy");
          enhanced.AppointmentTime = formatInTimeZone(appointmentDate, userTimezone, "HH:mm");
          enhanced.AppointmentDateTime = formatInTimeZone(appointmentDate, userTimezone, "EEEE, MMMM d, yyyy 'at' HH:mm");
          enhanced.Duration = "30 minutes"; // Default duration
          enhanced.ConsultationType = "Video consultation";
          enhanced.AppointmentURL = `/appointments/${appointmentId}`;
          enhanced.JoinLink = appointment.zoomJoinUrl || `/appointments/${appointmentId}/join`;
          
          // Template-expected appointment field names
          enhanced.appointment_datetime_local = formatInTimeZone(appointmentDate, userTimezone, "EEEE, MMMM d, yyyy 'at' HH:mm");
          enhanced.appointment_date_local = formatInTimeZone(appointmentDate, userTimezone, "EEEE, MMMM d, yyyy");
          enhanced.appointment_time_local = formatInTimeZone(appointmentDate, userTimezone, "HH:mm");
          enhanced.join_link = appointment.zoomJoinUrl || `/appointments/${appointmentId}/join`;

          if (doctor) {
            enhanced.DoctorName = `${doctor.firstName} ${doctor.lastName}`;
            enhanced.DoctorFirstName = doctor.firstName;
            enhanced.DoctorLastName = doctor.lastName;
            enhanced.DoctorSpecialization = "Medical Doctor"; // Default specialization
            enhanced.DoctorProfileURL = `/doctors/${appointment.doctorId}`;
            
            // Template-expected doctor field names
            enhanced.doctor_name = `${doctor.firstName} ${doctor.lastName}`;
            enhanced.doctor_first_name = doctor.firstName;
            enhanced.doctor_last_name = doctor.lastName;
            enhanced.doctor_specialization = "Medical Doctor"; // Default specialization
          }
        }
      } catch (error) {
        console.error("Error enhancing appointment data:", error);
      }
    }

    return enhanced;
  }

  /**
   * Schedule email notification
   */
  private async scheduleEmailNotification(params: {
    userId: number;
    appointmentId?: number;
    triggerCode: TriggerCode;
    templateKey: string;
    scheduledFor: Date;
    priority: number;
    mergeData: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const [result] = await db
      .insert(emailNotifications)
      .values({
        userId: params.userId,
        appointmentId: params.appointmentId,
        triggerCode: params.triggerCode,
        templateKey: params.templateKey,
        scheduledFor: params.scheduledFor,
        priority: params.priority,
        mergeData: params.mergeData,
        metadata: params.metadata || {}
      })
      .returning({ id: emailNotifications.id });

    return result.id;
  }

  /**
   * Schedule SMS notification
   */
  private async scheduleSMSNotification(params: {
    userId: number;
    appointmentId?: number;
    triggerCode: TriggerCode;
    templateKey: string;
    scheduledFor: Date;
    phoneNumber: string;
    mergeData: Record<string, any>;
  }): Promise<string> {
    const [result] = await db
      .insert(smsNotifications)
      .values({
        userId: params.userId,
        appointmentId: params.appointmentId,
        triggerCode: params.triggerCode,
        templateKey: params.templateKey,
        scheduledFor: params.scheduledFor,
        phoneNumber: params.phoneNumber,
        mergeData: params.mergeData
      })
      .returning({ id: smsNotifications.id });

    return result.id;
  }

  /**
   * Schedule push notification
   */
  private async schedulePushNotification(params: {
    userId: number;
    appointmentId?: number;
    triggerCode: TriggerCode;
    templateKey: string;
    scheduledFor: Date;
    mergeData: Record<string, any>;
  }): Promise<string> {
    const [result] = await db
      .insert(pushNotifications)
      .values({
        userId: params.userId,
        appointmentId: params.appointmentId,
        triggerCode: params.triggerCode,
        templateKey: params.templateKey,
        scheduledFor: params.scheduledFor,
        mergeData: params.mergeData
      })
      .returning({ id: pushNotifications.id });

    return result.id;
  }

  /**
   * Schedule in-app notification (banner and/or inbox)
   */
  private async scheduleInAppNotification(params: {
    userId: number;
    appointmentId?: number;
    triggerCode: TriggerCode;
    scheduledFor: Date;
    mergeData: Record<string, any>;
    channels: { banner: boolean; inbox: boolean };
  }): Promise<string[]> {
    const config = IN_APP_NOTIFICATION_CONFIG[params.triggerCode];
    if (!config) {
      return [];
    }

    const notifications = [];

    // Generate title and message from merge data and trigger
    const title = this.generateInAppTitle(params.triggerCode, params.mergeData);
    const message = this.generateInAppMessage(params.triggerCode, params.mergeData);
    const { ctaText, ctaUrl } = this.generateInAppCTA(params.triggerCode, params.mergeData);

    // Schedule banner notification
    if (params.channels.banner && config.banner) {
      const [result] = await db
        .insert(inAppNotifications)
        .values({
          userId: params.userId,
          appointmentId: params.appointmentId,
          type: "banner",
          triggerCode: params.triggerCode,
          title,
          message,
          ctaText,
          ctaUrl,
          priority: TRIGGER_PRIORITY[params.triggerCode],
          style: config.style,
          persistent: config.persistent,
          autoDismissSeconds: config.persistent ? null : (config.style === "urgent" ? 30 : 10),
          scheduledFor: params.scheduledFor,
          mergeData: params.mergeData
        })
        .returning({ id: inAppNotifications.id });
      
      notifications.push(result.id);
    }

    // Schedule inbox notification
    if (params.channels.inbox && config.inbox) {
      const [result] = await db
        .insert(inAppNotifications)
        .values({
          userId: params.userId,
          appointmentId: params.appointmentId,
          type: "inbox",
          triggerCode: params.triggerCode,
          title,
          message,
          ctaText,
          ctaUrl,
          priority: TRIGGER_PRIORITY[params.triggerCode],
          style: config.style,
          persistent: true, // Inbox items don't auto-dismiss
          scheduledFor: params.scheduledFor,
          expiresAt: addHours(params.scheduledFor, 72), // Expire after 3 days
          mergeData: params.mergeData
        })
        .returning({ id: inAppNotifications.id });
      
      notifications.push(result.id);
    }

    return notifications;
  }

  /**
   * Update frequency tracking for marketing/lifecycle notifications
   */
  private async updateFrequencyTracking(userId: number, triggerCode: TriggerCode, category: string): Promise<void> {
    // Only track marketing and lifecycle notifications
    if (category !== "marketing_emails" && category !== "life_cycle") {
      return;
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    // Upsert frequency tracking record
    await db
      .insert(notificationFrequencyTracking)
      .values({
        userId,
        category,
        channel: "email",
        weekStarting: weekStart.toISOString().split('T')[0], // Convert Date to string
        sentCount: 1,
        lastSentAt: new Date()
      })
      .onConflictDoUpdate({
        target: [
          notificationFrequencyTracking.userId,
          notificationFrequencyTracking.category,
          notificationFrequencyTracking.channel,
          notificationFrequencyTracking.weekStarting
        ],
        set: {
          sentCount: sql`${notificationFrequencyTracking.sentCount} + 1`,
          lastSentAt: new Date(),
          updatedAt: new Date()
        }
      });
  }

  /**
   * Log comprehensive audit event
   */
  private async logAuditEvent(params: {
    userId: number;
    appointmentId?: number;
    eventType: string;
    channel: string;
    triggerCode: TriggerCode;
    emailNotificationId?: string;
    smsNotificationId?: string;
    pushNotificationId?: string;
    inAppNotificationId?: string;
    details?: Record<string, any>;
    errorMessage?: string;
    userContext?: {
      ipAddress?: string;
      userAgent?: string;
    };
  }): Promise<void> {
    try {
      // Get user timezone for consistent logging
      const [prefs] = await db
        .select({
          userId: notificationPreferences.userId,
          timezone: notificationPreferences.timezone
        })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, params.userId));

      await db.insert(notificationAuditLog).values({
        userId: params.userId,
        appointmentId: params.appointmentId,
        eventType: params.eventType,
        channel: params.channel,
        triggerCode: params.triggerCode,
        emailNotificationId: params.emailNotificationId,
        smsNotificationId: params.smsNotificationId,
        pushNotificationId: params.pushNotificationId,
        inAppNotificationId: params.inAppNotificationId,
        details: params.details,
        errorMessage: params.errorMessage,
        ipAddress: params.userContext?.ipAddress,
        userAgent: params.userContext?.userAgent,
        locale: "en", // Default locale since it's not stored in preferences
        timezone: prefs?.timezone || "Europe/Paris"
      });
    } catch (error) {
      console.error("Error logging audit event:", error);
      // Don't throw - audit logging should not block notification processing
    }
  }

  /**
   * Generate appropriate title for in-app notifications
   */
  private generateInAppTitle(triggerCode: TriggerCode, mergeData: Record<string, any>): string {
    switch (triggerCode) {
      // Account & Security
      case TriggerCode.ACCOUNT_REG_SUCCESS:
        return "Welcome to Doktu! 🎉";
      case TriggerCode.ACCOUNT_PASSWORD_CHANGED:
        return "Password Updated";
      case TriggerCode.ACCOUNT_NEW_DEVICE:
        return "New Device Login";

      // Booking & Appointments
      case TriggerCode.BOOKING_CONFIRMED:
        return "Appointment Confirmed";
      case TriggerCode.BOOKING_PAYMENT_PENDING:
        return "Payment Required";
      case TriggerCode.BOOKING_LIVE_IMMINENT:
        return "Consultation Starting Soon";
      case TriggerCode.BOOKING_RESCHEDULED:
        return "Appointment Rescheduled";
      case TriggerCode.BOOKING_CANCELLED_DOCTOR:
        return "Appointment Cancelled";
      case TriggerCode.BOOKING_HOLD_EXPIRED:
        return "Booking Hold Expired";

      // Health Profile
      case TriggerCode.HEALTH_PROFILE_INCOMPLETE:
        return "Complete Your Health Profile";
      case TriggerCode.HEALTH_PROFILE_COMPLETED:
        return "Health Profile Complete ✓";
      case TriggerCode.HEALTH_DOC_DOCTOR_SHARED:
        return "New Document from Doctor";

      // Membership
      case TriggerCode.MEMBERSHIP_ACTIVATED:
        return "Membership Activated! 🎊";
      case TriggerCode.MEMBERSHIP_PAYMENT_FAILED_1:
        return "Payment Issue";
      case TriggerCode.MEMBERSHIP_SUSPENDED:
        return "Membership Suspended";
      case TriggerCode.MEMBERSHIP_ALLOWANCE_1_LEFT:
        return "1 Consultation Remaining";
      case TriggerCode.MEMBERSHIP_ALLOWANCE_EXHAUSTED:
        return "Consultations Used Up";

      // Default
      default:
        return "Notification";
    }
  }

  /**
   * Generate appropriate message for in-app notifications
   */
  private generateInAppMessage(triggerCode: TriggerCode, mergeData: Record<string, any>): string {
    const doctorName = mergeData.DoctorName || "your doctor";
    const appointmentDateTime = mergeData.AppointmentDateTime || "your appointment";

    switch (triggerCode) {
      // Account & Security
      case TriggerCode.ACCOUNT_REG_SUCCESS:
        return "Your account has been created successfully. Start booking consultations with certified doctors.";
      case TriggerCode.ACCOUNT_PASSWORD_CHANGED:
        return "Your password was changed successfully. If this wasn't you, contact support immediately.";
      case TriggerCode.ACCOUNT_NEW_DEVICE:
        return "A new device logged into your account. If this wasn't you, secure your account immediately.";

      // Booking & Appointments
      case TriggerCode.BOOKING_CONFIRMED:
        return `Your consultation with ${doctorName} is confirmed for ${appointmentDateTime}.`;
      case TriggerCode.BOOKING_PAYMENT_PENDING:
        return `Complete your payment to confirm your appointment with ${doctorName}.`;
      case TriggerCode.BOOKING_LIVE_IMMINENT:
        return `Your consultation with ${doctorName} starts in 5 minutes. Click to join now.`;
      case TriggerCode.BOOKING_RESCHEDULED:
        return `Your appointment has been rescheduled to ${appointmentDateTime}.`;
      case TriggerCode.BOOKING_CANCELLED_DOCTOR:
        return `${doctorName} had to cancel your appointment. You'll receive a full refund.`;
      case TriggerCode.BOOKING_HOLD_EXPIRED:
        return `Your booking hold has expired. The time slot is no longer reserved.`;

      // Health Profile
      case TriggerCode.HEALTH_PROFILE_INCOMPLETE:
        return "Complete your health profile to help doctors provide better care during consultations.";
      case TriggerCode.HEALTH_PROFILE_COMPLETED:
        return "Your health profile is now complete. Doctors can provide more personalized care.";
      case TriggerCode.HEALTH_DOC_DOCTOR_SHARED:
        return `${doctorName} has shared new documents with you. Review them in your health records.`;

      // Membership
      case TriggerCode.MEMBERSHIP_ACTIVATED:
        return "Your membership is now active! Enjoy priority booking and discounted consultations.";
      case TriggerCode.MEMBERSHIP_PAYMENT_FAILED_1:
        return "We couldn't process your membership payment. Please update your payment method.";
      case TriggerCode.MEMBERSHIP_SUSPENDED:
        return "Your membership has been suspended due to payment issues. Update your payment method to reactivate.";
      case TriggerCode.MEMBERSHIP_ALLOWANCE_1_LEFT:
        return "You have 1 consultation remaining in your current membership cycle.";
      case TriggerCode.MEMBERSHIP_ALLOWANCE_EXHAUSTED:
        return "You've used all consultations in your current cycle. Book additional consultations or upgrade your plan.";

      // Default
      default:
        return "You have a new notification from Doktu.";
    }
  }

  /**
   * Generate appropriate CTA for in-app notifications
   */
  private generateInAppCTA(triggerCode: TriggerCode, mergeData: Record<string, any>): { ctaText: string | null; ctaUrl: string | null } {
    const appointmentId = mergeData.AppointmentURL?.split('/').pop();
    const joinLink = mergeData.JoinLink;

    switch (triggerCode) {
      // Account & Security
      case TriggerCode.ACCOUNT_REG_SUCCESS:
        return { ctaText: "Browse Doctors", ctaUrl: "/doctors" };
      case TriggerCode.ACCOUNT_PASSWORD_CHANGED:
        return { ctaText: "Review Security", ctaUrl: "/security" };
      case TriggerCode.ACCOUNT_NEW_DEVICE:
        return { ctaText: "Secure Account", ctaUrl: "/account/sessions" };

      // Booking & Appointments
      case TriggerCode.BOOKING_CONFIRMED:
        return { ctaText: "View Details", ctaUrl: `/appointments/${appointmentId}` };
      case TriggerCode.BOOKING_PAYMENT_PENDING:
        return { ctaText: "Complete Payment", ctaUrl: `/appointments/${appointmentId}/payment` };
      case TriggerCode.BOOKING_LIVE_IMMINENT:
        return { ctaText: "Join Now", ctaUrl: joinLink || `/appointments/${appointmentId}/join` };
      case TriggerCode.BOOKING_RESCHEDULED:
        return { ctaText: "View Details", ctaUrl: `/appointments/${appointmentId}` };
      case TriggerCode.BOOKING_CANCELLED_DOCTOR:
        return { ctaText: "Book Another", ctaUrl: "/doctors" };
      case TriggerCode.BOOKING_HOLD_EXPIRED:
        return { ctaText: "Book Again", ctaUrl: "/doctors" };

      // Health Profile
      case TriggerCode.HEALTH_PROFILE_INCOMPLETE:
        return { ctaText: "Complete Profile", ctaUrl: "/health-profile" };
      case TriggerCode.HEALTH_PROFILE_COMPLETED:
        return { ctaText: "View Profile", ctaUrl: "/health-profile" };
      case TriggerCode.HEALTH_DOC_DOCTOR_SHARED:
        return { ctaText: "View Documents", ctaUrl: "/health-records" };

      // Membership
      case TriggerCode.MEMBERSHIP_ACTIVATED:
        return { ctaText: "View Benefits", ctaUrl: "/membership" };
      case TriggerCode.MEMBERSHIP_PAYMENT_FAILED_1:
        return { ctaText: "Update Payment", ctaUrl: "/membership/payment" };
      case TriggerCode.MEMBERSHIP_SUSPENDED:
        return { ctaText: "Reactivate", ctaUrl: "/membership/reactivate" };
      case TriggerCode.MEMBERSHIP_ALLOWANCE_1_LEFT:
        return { ctaText: "Book Consultation", ctaUrl: "/doctors" };
      case TriggerCode.MEMBERSHIP_ALLOWANCE_EXHAUSTED:
        return { ctaText: "Upgrade Plan", ctaUrl: "/membership/upgrade" };

      // Default
      default:
        return { ctaText: null, ctaUrl: null };
    }
  }

  /**
   * Schedule appointment reminders
   */
  async scheduleAppointmentReminders(appointmentId: number) {
    try {
      // Get appointment details
      const [appointment] = await db
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          doctorId: appointments.doctorId,
          appointmentDate: appointments.appointmentDate,
          status: appointments.status
        })
        .from(appointments)
        .where(eq(appointments.id, appointmentId));

      if (!appointment || appointment.status !== "paid") {
        return;
      }

      const appointmentTime = new Date(appointment.appointmentDate);

      // Schedule 24h reminder for patient
      await this.scheduleNotification({
        userId: appointment.patientId,
        appointmentId,
        triggerCode: TriggerCode.REM_24H,
        scheduledFor: subHours(appointmentTime, 24)
      });

      // Get doctor's user ID
      const [doctor] = await db
        .select({ userId: doctors.userId })
        .from(doctors)
        .where(eq(doctors.id, appointment.doctorId));

      if (doctor) {
        // Schedule 1h reminder for doctor
        await this.scheduleNotification({
          userId: doctor.userId,
          appointmentId,
          triggerCode: TriggerCode.REM_1H_DOC,
          scheduledFor: subHours(appointmentTime, 1)
        });
      }

      // Schedule 5min reminder for patient
      await this.scheduleNotification({
        userId: appointment.patientId,
        appointmentId,
        triggerCode: TriggerCode.REM_5M_PAT,
        scheduledFor: subMinutes(appointmentTime, 5)
      });

    } catch (error) {
      console.error("Error scheduling appointment reminders:", error);
      throw error;
    }
  }

  /**
   * Process pending notifications
   */
  async processPendingNotifications() {
    const now = new Date();
    const nowISOString = now.toISOString();
    
    try {
      // Process email notifications - using raw SQL with proper rows handling
      console.log('🔍 Processing email notifications with raw SQL...');
      const emailResult = await db.execute(sql`
        SELECT id, user_id as "userId", trigger_code as "triggerCode", 
               template_key as "templateKey", status, retry_count as "retryCount",
               appointment_id as "appointmentId", merge_data as "mergeData"
        FROM email_notifications 
        WHERE (status = 'pending' AND scheduled_for <= ${nowISOString}) 
           OR (status = 'failed' AND retry_count < 3)
        LIMIT 5
      `);

      // Handle the direct array result from raw SQL queries
      const emailRows = emailResult;
      console.log(`📧 Found ${emailRows.length} email notifications to process`);
      for (const notification of emailRows) {
        await this.sendEmailNotification(notification);
      }

      // Process SMS notifications - using raw SQL with proper rows handling
      console.log('🔍 Processing SMS notifications with raw SQL...');
      const smsResult = await db.execute(sql`
        SELECT id, user_id as "userId", trigger_code as "triggerCode", 
               status, scheduled_for as "scheduledFor", retry_count as "retryCount"
        FROM sms_notifications 
        WHERE (status = 'pending' AND scheduled_for <= ${nowISOString})
           OR (status = 'failed' AND retry_count < 3)
        LIMIT 5
      `);

      // Handle the direct array result from raw SQL queries
      const smsRows = smsResult;
      console.log(`📱 Found ${smsRows.length} SMS notifications to process`);
      for (const notification of smsRows) {
        await this.sendSMSNotification(notification);
      }

      // Process push notifications - using raw SQL with proper rows handling
      console.log('🔍 Processing push notifications with raw SQL...');
      const pushResult = await db.execute(sql`
        SELECT id, user_id as "userId", trigger_code as "triggerCode", 
               status, scheduled_for as "scheduledFor"
        FROM push_notifications 
        WHERE (status = 'pending' AND scheduled_for <= ${nowISOString})
           OR (status = 'failed')
        LIMIT 5
      `);

      // Handle the direct array result from raw SQL queries
      const pushRows = pushResult;
      console.log(`📲 Found ${pushRows.length} push notifications to process`);
      for (const notification of pushRows) {
        await this.sendPushNotification(notification);
      }

    } catch (error) {
      console.error("Error processing pending notifications:", error);
      throw error;
    }
  }



  /**
   * Schedule email notification
   */
  private async scheduleEmail(params: any) {
    // Check if notification already exists to prevent duplicates
    if (params.appointmentId) {
      const [existing] = await db
        .select({ id: emailNotifications.id })
        .from(emailNotifications)
        .where(and(
          eq(emailNotifications.appointmentId, params.appointmentId),
          eq(emailNotifications.triggerCode, params.triggerCode),
          eq(emailNotifications.userId, params.userId)
        ))
        .limit(1);

      if (existing) {
        console.log(`⚠️ Email notification already exists for appointment ${params.appointmentId}, trigger ${params.triggerCode}, user ${params.userId} - skipping duplicate`);
        return;
      }
    }

    await db.insert(emailNotifications).values(params);
  }

  /**
   * Schedule SMS notification
   */
  private async scheduleSMS(params: any) {
    // Get user phone number
    const [user] = await db
      .select({
        id: users.id,
        phone: users.phone
      })
      .from(users)
      .where(eq(users.id, params.userId));

    if (user && user.phone) {
      await db.insert(smsNotifications).values({
        ...params,
        phoneNumber: user.phone
      });
    }
  }

  /**
   * Schedule push notification
   */
  private async schedulePush(params: any) {
    await db.insert(pushNotifications).values(params);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: any) {
    try {
      // Get user details
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.id, notification.userId));

      if (!user || !user.email) {
        throw new Error("User email not found");
      }

      // Get user's locale preference for i18n
      const [userPrefs] = await db
        .select({
          locale: notificationPreferences.locale
        })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, notification.userId));

      const userLocale = userPrefs?.locale || 'en';

      // Merge notification's merge_data with minimal user context
      console.log('📧 Creating merge data for notification:', notification.id);
      const minimalMergeData = {
        // Universal template fields
        first_name: user.firstName || "there",
        patient_first_name: user.firstName || "there",
        patient_full_name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",

        // Legacy fields for backward compatibility
        FirstName: user.firstName || "there",
        PlatformName: "Doktu",
        SupportEmail: "support@doktu.com",
        AppointmentDate: "Your upcoming appointment",
        DoctorName: "Your doctor",

        // Additional common fields
        verification_link: `${process.env.CLIENT_URL || 'https://doktu.co'}/verify`,
        appointment_datetime_local: "Your upcoming appointment",
        doctor_name: "Your doctor",
        join_link: `${process.env.CLIENT_URL || 'https://doktu.co'}/consultation`
      };

      // Parse notification merge data and merge with minimal data
      // Notification-specific data takes precedence over defaults
      const notificationMergeData = typeof notification.mergeData === 'string'
        ? JSON.parse(notification.mergeData)
        : (notification.mergeData || {});

      let finalMergeData = {
        ...minimalMergeData,
        ...notificationMergeData
      };

      // Enrich with appointment data if appointmentId is present
      if (notification.appointmentId) {
        console.log('📅 Enriching merge data with appointment details for appointment:', notification.appointmentId);

        try {
          // Fetch full appointment data with doctor and patient info
          const [appointmentData] = await db
            .select({
              id: appointments.id,
              appointmentDate: appointments.appointmentDate,
              status: appointments.status,
              price: appointments.price,
              zoomJoinUrl: appointments.zoomJoinUrl,
              patientId: appointments.patientId,
              doctorId: appointments.doctorId
            })
            .from(appointments)
            .where(eq(appointments.id, notification.appointmentId));

          if (appointmentData) {
            // Get doctor details with specialty
            const [doctorData] = await db
              .select({
                userId: doctors.userId,
                specialty: doctors.specialty,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email
              })
              .from(doctors)
              .innerJoin(users, eq(doctors.userId, users.id))
              .where(eq(doctors.id, appointmentData.doctorId));

            // Get patient timezone preference
            const userTimezone = userPrefs?.timezone || 'Europe/Paris';

            // Format appointment datetime in user's timezone
            const appointmentDatetimeLocal = appointmentData.appointmentDate
              ? formatInTimeZone(appointmentData.appointmentDate, userTimezone, 'EEEE, MMMM d, yyyy \'at\' h:mm a')
              : 'Your upcoming appointment';

            // Enrich merge data with full appointment details
            finalMergeData = {
              ...finalMergeData,
              appointment_id: appointmentData.id.toString(),
              appointment_datetime_utc: appointmentData.appointmentDate?.toISOString() || '',
              appointment_datetime_local: appointmentDatetimeLocal,
              patient_timezone: userTimezone,
              doctor_name: doctorData ? `Dr. ${doctorData.firstName} ${doctorData.lastName}`.trim() : 'Your doctor',
              doctor_specialization: doctorData?.specialty || 'General Practice',
              join_link: appointmentData.zoomJoinUrl || `${process.env.VITE_APP_URL}/consultation`,
              price: appointmentData.price || '35.00',
              currency: '€'
            };

            console.log('✅ Appointment data enriched successfully');
          } else {
            console.warn(`⚠️ Appointment ${notification.appointmentId} not found - using fallback data`);
          }
        } catch (enrichmentError) {
          console.error('❌ Failed to enrich appointment data:', enrichmentError);
          // Continue with fallback data if enrichment fails
        }
      }

      console.log('📧 Final merge data keys:', Object.keys(finalMergeData));
      console.log('🌍 Using locale for email template:', userLocale);

      // Get email template with merged data and user's locale
      console.log('📧 Step 1: About to call getEmailTemplate');
      const template = await getEmailTemplate(notification.templateKey, finalMergeData, userLocale);
      console.log('✅ Step 1 complete: getEmailTemplate succeeded');

      // Add .ics attachment if needed
      let attachments = [];
      if (notification.triggerCode === TriggerCode.BOOK_CONF && notification.appointmentId) {
        console.log('📧 Step 2: About to call createICSAttachment');
        try {
          const icsContent = await createICSAttachment(notification.appointmentId, "ADD");
          console.log('✅ Step 2 complete: createICSAttachment succeeded');
          attachments.push({
            filename: "appointment.ics",
            content: icsContent,
            contentType: "text/calendar"
          });
        } catch (icsError: any) {
          console.error('❌ Step 2 FAILED: createICSAttachment error:', icsError.message);
          console.error('❌ ICS Error stack:', icsError.stack);
          // Continue without attachment rather than failing the entire email
        }
      }

      // Disable link tracking for security-sensitive and appointment emails to prevent antivirus blocking
      // Link tracking wraps URLs in Mailgun redirects that trigger Bitdefender and other AV software
      const securitySensitiveTriggers = [
        // Security-sensitive account emails
        TriggerCode.ACCOUNT_REG_SUCCESS,       // A1 - Registration success with verification link
        TriggerCode.ACCOUNT_EMAIL_VERIFY,      // A2 - Email verification
        TriggerCode.ACCOUNT_PASSWORD_RESET,    // A3 - Password reset links
        TriggerCode.ACCOUNT_PASSWORD_CHANGED,  // A4 - Security confirmation
        TriggerCode.ACCOUNT_EMAIL_VERIFICATION, // A2 - Email verification (alias)
        TriggerCode.ACCOUNT_EMAIL_CHANGE,      // A5 - Email change confirmation
        TriggerCode.ACCOUNT_DELETION_CONFIRM,  // A6 - Account deletion
        TriggerCode.ACCOUNT_SUSPENSION_NOTICE,  // A7 - Account suspension

        // Booking/appointment emails (contain Zoom links that trigger AV when wrapped)
        TriggerCode.BOOKING_CONFIRMED,         // B3 - Booking confirmation with Zoom link
        TriggerCode.BOOKING_REMINDER_24H,      // B4 - 24h reminder with Zoom link
        TriggerCode.BOOKING_REMINDER_1H,       // B5 - 1h reminder with Zoom link
        TriggerCode.BOOKING_LIVE_IMMINENT,     // B6 - Imminent consultation with Zoom link
        TriggerCode.BOOKING_RESCHEDULED        // B7 - Rescheduled with new Zoom link
      ];

      const shouldDisableTracking = securitySensitiveTriggers.includes(notification.triggerCode as any);

      if (shouldDisableTracking) {
        console.log(`🔒 Disabling link tracking to prevent Bitdefender/AV blocking: ${notification.triggerCode}`);
      }

      // Send email
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        attachments,
        disableTracking: shouldDisableTracking
      });

      // Update notification status
      await db
        .update(emailNotifications)
        .set({
          status: "sent",
          sentAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(emailNotifications.id, notification.id));

    } catch (error: any) {
      console.error("Error sending email notification:", error);
      
      // Update retry count and status
      await db
        .update(emailNotifications)
        .set({
          retryCount: notification.retryCount + 1,
          status: notification.retryCount >= 2 ? "failed" : "pending",
          errorMessage: error.message,
          updatedAt: new Date()
        })
        .where(eq(emailNotifications.id, notification.id));
    }
  }

  /**
   * Send SMS notification (placeholder)
   */
  private async sendSMSNotification(notification: any) {
    // TODO: Integrate with SMS provider (Twilio, etc.)
    console.log("SMS notification would be sent:", notification);
    
    await db
      .update(smsNotifications)
      .set({
        status: "sent",
        sentAt: new Date()
      })
      .where(eq(smsNotifications.id, notification.id));
  }

  /**
   * Send push notification (placeholder)
   */
  private async sendPushNotification(notification: any) {
    // TODO: Integrate with push notification service
    console.log("Push notification would be sent:", notification);
    
    await db
      .update(pushNotifications)
      .set({
        status: "sent",
        sentAt: new Date()
      })
      .where(eq(pushNotifications.id, notification.id));
  }
}

export const notificationService = new UniversalNotificationService();