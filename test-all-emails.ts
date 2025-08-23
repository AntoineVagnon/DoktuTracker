#!/usr/bin/env tsx
/**
 * Test script to send all email notification types
 * Run with: tsx test-all-emails.ts
 */

import { db } from "./server/db";
import { users, appointments, doctors } from "./shared/schema";
import { eq } from "drizzle-orm";
import { notificationService, TriggerCode } from "./server/services/notificationService";

const TEST_EMAIL = "antoine.vagnon@gmail.com";

async function createTestUser() {
  console.log("🔧 Creating test user...");
  
  // Check if test user exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, TEST_EMAIL));

  if (existingUser) {
    console.log("✅ Test user already exists");
    return existingUser;
  }

  // Create test user
  const [newUser] = await db
    .insert(users)
    .values({
      email: TEST_EMAIL,
      username: "Antoine Test User",
      firstName: "Antoine",
      lastName: "Vagnon",
      password: "test123", // This won't be used
      role: "patient",
      phone: "+33 6 12 34 56 78"
    })
    .returning();

  console.log("✅ Test user created");
  return newUser;
}

async function getTestDoctor() {
  // Get a doctor for appointment-related emails
  const result = await db
    .select()
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .limit(1);

  if (result.length === 0) {
    console.log("⚠️  No doctors found in database");
    return null;
  }

  const doctorData = result[0];
  return {
    id: doctorData.doctors.id,
    userId: doctorData.doctors.userId,
    firstName: doctorData.users.firstName,
    lastName: doctorData.users.lastName,
    specialization: doctorData.doctors.specialization
  };
}

async function createTestAppointment(userId: number, doctorId: number) {
  // Create a test appointment for appointment-related emails
  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + 2); // 2 days from now
  appointmentDate.setHours(14, 30, 0, 0); // 2:30 PM

  const [appointment] = await db
    .insert(appointments)
    .values({
      patientId: userId,
      doctorId: doctorId,
      appointmentDate: appointmentDate,
      duration: 30,
      consultationType: "Video consultation",
      status: "paid",
      price: 35,
      zoomJoinUrl: "https://zoom.us/j/123456789"
    })
    .returning();

  return appointment;
}

async function sendAllEmails() {
  try {
    console.log("\n🚀 Starting comprehensive email notification test");
    console.log("📧 Sending all emails to:", TEST_EMAIL);
    console.log("=" .repeat(60));

    // Setup test data
    const testUser = await createTestUser();
    const testDoctor = await getTestDoctor();
    const testAppointment = testDoctor ? await createTestAppointment(testUser.id, testDoctor.id) : null;

    const baseContext = {
      userContext: {
        ipAddress: "127.0.0.1",
        userAgent: "TestScript/1.0"
      }
    };

    const appointmentMergeData = testAppointment && testDoctor ? {
      DoctorName: `Dr. ${testDoctor.firstName} ${testDoctor.lastName}`,
      DoctorFirstName: testDoctor.firstName,
      DoctorLastName: testDoctor.lastName,
      DoctorSpecialization: testDoctor.specialization,
      AppointmentDate: "Monday, August 25, 2025",
      AppointmentTime: "14:30",
      AppointmentDateTime: "Monday, August 25, 2025 at 14:30",
      Duration: "30 minutes",
      ConsultationType: "Video consultation",
      AppointmentURL: `/appointments/${testAppointment.id}`,
      JoinLink: testAppointment.zoomJoinUrl || `/appointments/${testAppointment.id}/join`
    } : {};

    // Group 1: Account & Security Notifications (A1-A6)
    console.log("\n📂 Account & Security Notifications");
    console.log("-".repeat(40));

    const accountNotifications = [
      { code: TriggerCode.ACCOUNT_REG_SUCCESS, name: "Account Registration Success" },
      { code: TriggerCode.ACCOUNT_EMAIL_VERIFY, name: "Email Verification" },
      { code: TriggerCode.ACCOUNT_PASSWORD_RESET, name: "Password Reset" },
      { code: TriggerCode.ACCOUNT_PASSWORD_CHANGED, name: "Password Changed" },
      { code: TriggerCode.ACCOUNT_NEW_DEVICE, name: "New Device Login" },
      { code: TriggerCode.ACCOUNT_MFA_UPDATED, name: "MFA Settings Updated" }
    ];

    for (const notification of accountNotifications) {
      console.log(`📨 Sending: ${notification.name}`);
      await notificationService.scheduleNotification({
        userId: testUser.id,
        triggerCode: notification.code,
        mergeData: {
          ResetLink: "https://doktu.com/reset/token123",
          VerificationLink: "https://doktu.com/verify/token456",
          DeviceName: "Chrome on Windows",
          DeviceLocation: "Paris, France",
          LoginTime: "August 23, 2025 at 19:00"
        },
        ...baseContext
      });
    }

    // Group 2: Health Profile & Documents (H1-H5)
    console.log("\n📋 Health Profile & Document Notifications");
    console.log("-".repeat(40));

    const healthNotifications = [
      { code: TriggerCode.HEALTH_PROFILE_INCOMPLETE, name: "Health Profile Incomplete" },
      { code: TriggerCode.HEALTH_PROFILE_COMPLETED, name: "Health Profile Completed" },
      { code: TriggerCode.HEALTH_DOC_PATIENT_UPLOADED, name: "Patient Document Uploaded" },
      { code: TriggerCode.HEALTH_DOC_DOCTOR_SHARED, name: "Doctor Shared Document" },
      { code: TriggerCode.HEALTH_DOC_UPLOAD_FAILED, name: "Document Upload Failed" }
    ];

    for (const notification of healthNotifications) {
      console.log(`📨 Sending: ${notification.name}`);
      await notificationService.scheduleNotification({
        userId: testUser.id,
        triggerCode: notification.code,
        mergeData: {
          DocumentName: "Medical_History.pdf",
          DocumentType: "Medical History",
          ProfileCompletionPercentage: "75%",
          MissingFields: "Emergency Contact, Allergies",
          ...appointmentMergeData
        },
        ...baseContext
      });
    }

    // Group 3: Booking & Appointment Notifications (B1-B12)
    if (testAppointment) {
      console.log("\n📅 Booking & Appointment Notifications");
      console.log("-".repeat(40));

      const bookingNotifications = [
        { code: TriggerCode.BOOKING_PAYMENT_PENDING, name: "Payment Pending" },
        { code: TriggerCode.BOOKING_HOLD_EXPIRED, name: "Booking Hold Expired" },
        { code: TriggerCode.BOOKING_CONFIRMED, name: "Booking Confirmed" },
        { code: TriggerCode.BOOKING_REMINDER_24H, name: "24-Hour Reminder" },
        { code: TriggerCode.BOOKING_REMINDER_1H, name: "1-Hour Reminder" },
        { code: TriggerCode.BOOKING_LIVE_IMMINENT, name: "Live Imminent (5 min)" },
        { code: TriggerCode.BOOKING_RESCHEDULED, name: "Appointment Rescheduled" },
        { code: TriggerCode.BOOKING_CANCELLED_PATIENT_EARLY, name: "Cancelled by Patient (Early)" },
        { code: TriggerCode.BOOKING_CANCELLED_PATIENT_LATE, name: "Cancelled by Patient (Late)" },
        { code: TriggerCode.BOOKING_CANCELLED_DOCTOR, name: "Cancelled by Doctor" },
        { code: TriggerCode.BOOKING_DOCTOR_NO_SHOW, name: "Doctor No-Show" },
        { code: TriggerCode.BOOKING_PATIENT_NO_SHOW, name: "Patient No-Show" }
      ];

      for (const notification of bookingNotifications) {
        console.log(`📨 Sending: ${notification.name}`);
        await notificationService.scheduleNotification({
          userId: testUser.id,
          appointmentId: testAppointment.id,
          triggerCode: notification.code,
          mergeData: {
            ...appointmentMergeData,
            PaymentAmount: "€35",
            RefundAmount: "€35",
            CancellationReason: "Schedule conflict",
            RescheduledDate: "Tuesday, August 26, 2025",
            RescheduledTime: "15:00",
            HoldExpiryTime: "20:00 tonight"
          },
          ...baseContext
        });
      }
    }

    // Group 4: Membership & Payment Notifications (M1-M10, P1-P2)
    console.log("\n💳 Membership & Payment Notifications");
    console.log("-".repeat(40));

    const membershipNotifications = [
      { code: TriggerCode.MEMBERSHIP_ACTIVATED, name: "Membership Activated" },
      { code: TriggerCode.MEMBERSHIP_RENEWAL_UPCOMING, name: "Renewal Upcoming" },
      { code: TriggerCode.MEMBERSHIP_RENEWED, name: "Membership Renewed" },
      { code: TriggerCode.MEMBERSHIP_PAYMENT_FAILED_1, name: "Payment Failed (1st)" },
      { code: TriggerCode.MEMBERSHIP_SUSPENDED, name: "Membership Suspended" },
      { code: TriggerCode.MEMBERSHIP_CANCELLED, name: "Membership Cancelled" },
      { code: TriggerCode.MEMBERSHIP_REACTIVATED, name: "Membership Reactivated" },
      { code: TriggerCode.MEMBERSHIP_ALLOWANCE_1_LEFT, name: "1 Consultation Left" },
      { code: TriggerCode.MEMBERSHIP_ALLOWANCE_EXHAUSTED, name: "Allowance Exhausted" },
      { code: TriggerCode.MEMBERSHIP_MONTHLY_RESET, name: "Monthly Reset" },
      { code: TriggerCode.PAYMENT_RECEIPT, name: "Payment Receipt" },
      { code: TriggerCode.PAYMENT_REFUND_ISSUED, name: "Refund Issued" }
    ];

    for (const notification of membershipNotifications) {
      console.log(`📨 Sending: ${notification.name}`);
      await notificationService.scheduleNotification({
        userId: testUser.id,
        triggerCode: notification.code,
        mergeData: {
          MembershipPlan: "Monthly Premium",
          MembershipPrice: "€45/month",
          RenewalDate: "September 23, 2025",
          ConsultationsRemaining: "1",
          ConsultationsTotal: "2",
          PaymentAmount: "€45",
          RefundAmount: "€35",
          InvoiceNumber: "INV-2025-0823",
          PaymentMethod: "•••• 4242",
          FailureReason: "Insufficient funds",
          ReactivationLink: "https://doktu.com/membership/reactivate"
        },
        ...baseContext
      });
    }

    // Group 5: Calendar & Availability (C1-C2)
    console.log("\n📆 Calendar & Availability Notifications");
    console.log("-".repeat(40));

    const calendarNotifications = [
      { code: TriggerCode.CALENDAR_AVAILABILITY_UPDATED, name: "Availability Updated" },
      { code: TriggerCode.CALENDAR_CONFLICT_DETECTED, name: "Calendar Conflict" }
    ];

    for (const notification of calendarNotifications) {
      console.log(`📨 Sending: ${notification.name}`);
      await notificationService.scheduleNotification({
        userId: testUser.id,
        triggerCode: notification.code,
        mergeData: {
          UpdatedSlots: "Monday 10:00-12:00, Wednesday 14:00-17:00",
          ConflictingAppointment: "August 25, 2025 at 14:30",
          ConflictReason: "Double booking detected"
        },
        ...baseContext
      });
    }

    // Group 6: Growth & Lifecycle (G1-G12)
    console.log("\n🚀 Growth & Lifecycle Notifications");
    console.log("-".repeat(40));

    const growthNotifications = [
      { code: TriggerCode.GROWTH_ONBOARDING_WELCOME, name: "Onboarding Welcome" },
      { code: TriggerCode.GROWTH_ONBOARDING_PROFILE, name: "Complete Profile Nudge" },
      { code: TriggerCode.GROWTH_FIRST_BOOKING_NUDGE, name: "First Booking Nudge" },
      { code: TriggerCode.GROWTH_RE_ENGAGEMENT_30D, name: "Re-engagement (30 days)" },
      { code: TriggerCode.GROWTH_RE_ENGAGEMENT_90D, name: "Re-engagement (90 days)" },
      { code: TriggerCode.GROWTH_SURVEY_POST_CONSULTATION, name: "Post-Consultation Survey" },
      { code: TriggerCode.GROWTH_REFERRAL_PROGRAM, name: "Referral Program" },
      { code: TriggerCode.GROWTH_FEATURE_ANNOUNCEMENT, name: "Feature Announcement" },
      { code: TriggerCode.GROWTH_SEASONAL_CAMPAIGN, name: "Seasonal Campaign" },
      { code: TriggerCode.GROWTH_MEMBERSHIP_UPSELL, name: "Membership Upsell" },
      { code: TriggerCode.GROWTH_DOCTOR_RATING_REQUEST, name: "Doctor Rating Request" },
      { code: TriggerCode.GROWTH_APP_UPDATE_AVAILABLE, name: "App Update Available" }
    ];

    for (const notification of growthNotifications) {
      console.log(`📨 Sending: ${notification.name}`);
      await notificationService.scheduleNotification({
        userId: testUser.id,
        appointmentId: testAppointment?.id,
        triggerCode: notification.code,
        mergeData: {
          ...appointmentMergeData,
          SurveyLink: "https://doktu.com/survey/abc123",
          ReferralCode: "ANTOINE25",
          ReferralReward: "€10 credit",
          FeatureName: "AI Health Assistant",
          FeatureDescription: "Get instant health insights powered by AI",
          CampaignName: "Summer Wellness Check",
          CampaignDiscount: "20% off",
          UpdateVersion: "2.5.0",
          UpdateFeatures: "Improved video quality, faster loading times"
        },
        ...baseContext
      });
    }

    // Legacy notifications (for backward compatibility)
    console.log("\n🔄 Legacy Notification Codes");
    console.log("-".repeat(40));

    const legacyNotifications = [
      { code: TriggerCode.BOOK_CONF, name: "Legacy Booking Confirmation" },
      { code: TriggerCode.REM_24H, name: "Legacy 24H Reminder" },
      { code: TriggerCode.REM_1H_DOC, name: "Legacy 1H Doctor Reminder" },
      { code: TriggerCode.REM_10M_DOC, name: "Legacy 10M Doctor Reminder" },
      { code: TriggerCode.REM_5M_PAT, name: "Legacy 5M Patient Reminder" },
      { code: TriggerCode.RESCHED, name: "Legacy Reschedule" },
      { code: TriggerCode.CANCEL, name: "Legacy Cancel" },
      { code: TriggerCode.SURVEY, name: "Legacy Survey" },
      { code: TriggerCode.NO_SHOW, name: "Legacy No-Show" },
      { code: TriggerCode.FREE_CREDIT, name: "Legacy Free Credit" },
      { code: TriggerCode.PROFILE_NEEDED, name: "Legacy Profile Needed" }
    ];

    for (const notification of legacyNotifications) {
      console.log(`📨 Sending: ${notification.name}`);
      await notificationService.scheduleNotification({
        userId: testUser.id,
        appointmentId: testAppointment?.id,
        triggerCode: notification.code,
        mergeData: appointmentMergeData,
        ...baseContext
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All email notifications have been scheduled!");
    console.log(`📧 Check ${TEST_EMAIL} for the test emails`);
    console.log("\n⚠️  Note: Some emails may be suppressed due to:");
    console.log("   - Category preferences (marketing, lifecycle)");
    console.log("   - Frequency caps (1/week marketing, 3/week lifecycle)");
    console.log("   - Duplicate protection (30-minute window)");
    console.log("   - Priority-based suppression rules");
    
    // Process the notification queue
    console.log("\n🔄 Processing notification queue...");
    await notificationService.processEmailQueue();
    
    console.log("✅ Email queue processed!");

  } catch (error) {
    console.error("❌ Error sending test emails:", error);
    throw error;
  }
}

// Run the test
sendAllEmails()
  .then(() => {
    console.log("\n🎉 Test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  });