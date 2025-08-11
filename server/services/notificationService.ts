import { db } from "../db";
import { 
  emailNotifications, 
  smsNotifications, 
  pushNotifications,
  notificationPreferences,
  appointments,
  users,
  doctors
} from "@shared/schema";
import { eq, and, lte, or, isNull, desc } from "drizzle-orm";
import { format, addHours, addMinutes, subHours, subMinutes } from "date-fns";
import { sendEmail } from "./emailService";
import { createICSAttachment } from "./calendarService";
import { getEmailTemplate } from "./emailTemplates";

// Trigger codes from the specification
export enum TriggerCode {
  BOOK_CONF = "BOOK_CONF",
  REM_24H = "REM_24H",
  REM_1H_DOC = "REM_1H_DOC",
  REM_10M_DOC = "REM_10M_DOC",
  REM_5M_PAT = "REM_5M_PAT",
  RESCHED = "RESCHED",
  CANCEL = "CANCEL",
  SURVEY = "SURVEY",
  NO_SHOW = "NO_SHOW",
  FREE_CREDIT = "FREE_CREDIT",
  PROFILE_NEEDED = "PROFILE_NEEDED"
}

// Priority mapping (higher number = higher priority)
const TRIGGER_PRIORITY: Record<TriggerCode, number> = {
  [TriggerCode.SURVEY]: 100,
  [TriggerCode.BOOK_CONF]: 90,
  [TriggerCode.REM_24H]: 80,
  [TriggerCode.REM_1H_DOC]: 70,
  [TriggerCode.REM_10M_DOC]: 60,
  [TriggerCode.REM_5M_PAT]: 50,
  [TriggerCode.RESCHED]: 40,
  [TriggerCode.CANCEL]: 30,
  [TriggerCode.NO_SHOW]: 20,
  [TriggerCode.FREE_CREDIT]: 10,
  [TriggerCode.PROFILE_NEEDED]: 5
};

// Template key mapping
const TRIGGER_TEMPLATES: Record<TriggerCode, string> = {
  [TriggerCode.BOOK_CONF]: "booking_confirmation",
  [TriggerCode.REM_24H]: "booking_reminder_24h",
  [TriggerCode.REM_1H_DOC]: "doctor_upcoming_1h",
  [TriggerCode.REM_10M_DOC]: "sms_doctor_10m",
  [TriggerCode.REM_5M_PAT]: "push_patient_5m",
  [TriggerCode.RESCHED]: "reschedule_confirmation",
  [TriggerCode.CANCEL]: "cancellation_confirmation",
  [TriggerCode.SURVEY]: "post_call_survey",
  [TriggerCode.NO_SHOW]: "doctor_no_show_patient",
  [TriggerCode.FREE_CREDIT]: "welcome_free_credit",
  [TriggerCode.PROFILE_NEEDED]: "profile_reminder"
};

export class NotificationService {
  /**
   * Schedule a notification based on trigger code
   */
  async scheduleNotification(params: {
    userId: number;
    appointmentId?: number;
    triggerCode: TriggerCode;
    scheduledFor?: Date;
    mergeData?: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    const { userId, appointmentId, triggerCode, scheduledFor = new Date(), mergeData = {}, metadata = {} } = params;
    
    try {
      // Get user preferences
      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));

      // Create default preferences if not exists
      if (!prefs) {
        await db.insert(notificationPreferences).values({ userId });
      }

      const preferences = prefs || { emailEnabled: true, smsEnabled: false, pushEnabled: false };
      
      // Determine channels based on trigger and preferences
      const channels = this.getChannelsForTrigger(triggerCode, preferences);
      
      // Check for duplicate notifications
      const isDuplicate = await this.checkDuplicateNotification(userId, appointmentId, triggerCode);
      if (isDuplicate) {
        console.log(`Duplicate notification prevented for user ${userId}, trigger ${triggerCode}`);
        return;
      }

      // Schedule notifications for each channel
      if (channels.email) {
        await this.scheduleEmail({
          userId,
          appointmentId,
          triggerCode,
          templateKey: TRIGGER_TEMPLATES[triggerCode],
          scheduledFor,
          priority: TRIGGER_PRIORITY[triggerCode],
          mergeData,
          metadata
        });
      }

      if (channels.sms) {
        await this.scheduleSMS({
          userId,
          appointmentId,
          triggerCode,
          templateKey: TRIGGER_TEMPLATES[triggerCode],
          scheduledFor,
          mergeData
        });
      }

      if (channels.push) {
        await this.schedulePush({
          userId,
          appointmentId,
          triggerCode,
          templateKey: TRIGGER_TEMPLATES[triggerCode],
          scheduledFor,
          mergeData
        });
      }

    } catch (error) {
      console.error("Error scheduling notification:", error);
      throw error;
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
    
    try {
      // Process email notifications
      const pendingEmails = await db
        .select()
        .from(emailNotifications)
        .where(and(
          eq(emailNotifications.status, "pending"),
          lte(emailNotifications.scheduledFor, now),
          or(
            eq(emailNotifications.retryCount, 0),
            isNull(emailNotifications.retryCount)
          )
        ))
        .orderBy(desc(emailNotifications.priority));

      for (const notification of pendingEmails) {
        await this.sendEmailNotification(notification);
      }

      // Process SMS notifications
      const pendingSMS = await db
        .select()
        .from(smsNotifications)
        .where(and(
          eq(smsNotifications.status, "pending"),
          lte(smsNotifications.scheduledFor, now)
        ));

      for (const notification of pendingSMS) {
        await this.sendSMSNotification(notification);
      }

      // Process push notifications
      const pendingPush = await db
        .select()
        .from(pushNotifications)
        .where(and(
          eq(pushNotifications.status, "pending"),
          lte(pushNotifications.scheduledFor, now)
        ));

      for (const notification of pendingPush) {
        await this.sendPushNotification(notification);
      }

    } catch (error) {
      console.error("Error processing pending notifications:", error);
      throw error;
    }
  }

  /**
   * Get channels for a specific trigger
   */
  private getChannelsForTrigger(triggerCode: TriggerCode, preferences: any) {
    const channels = { email: false, sms: false, push: false };

    switch (triggerCode) {
      case TriggerCode.BOOK_CONF:
      case TriggerCode.REM_24H:
      case TriggerCode.RESCHED:
      case TriggerCode.CANCEL:
      case TriggerCode.SURVEY:
      case TriggerCode.NO_SHOW:
      case TriggerCode.FREE_CREDIT:
      case TriggerCode.PROFILE_NEEDED:
        channels.email = preferences.emailEnabled;
        break;
      
      case TriggerCode.REM_1H_DOC:
        channels.push = preferences.pushEnabled;
        break;
      
      case TriggerCode.REM_10M_DOC:
        channels.sms = preferences.smsEnabled;
        break;
      
      case TriggerCode.REM_5M_PAT:
        channels.push = preferences.pushEnabled;
        break;
    }

    return channels;
  }

  /**
   * Check for duplicate notifications
   */
  private async checkDuplicateNotification(userId: number, appointmentId: number | undefined, triggerCode: TriggerCode) {
    const thirtyMinutesAgo = subMinutes(new Date(), 30);
    
    const [existing] = await db
      .select()
      .from(emailNotifications)
      .where(and(
        eq(emailNotifications.userId, userId),
        appointmentId ? eq(emailNotifications.appointmentId, appointmentId) : isNull(emailNotifications.appointmentId),
        eq(emailNotifications.triggerCode, triggerCode),
        eq(emailNotifications.status, "sent"),
        lte(emailNotifications.sentAt, thirtyMinutesAgo)
      ));

    return !!existing;
  }

  /**
   * Schedule email notification
   */
  private async scheduleEmail(params: any) {
    await db.insert(emailNotifications).values(params);
  }

  /**
   * Schedule SMS notification
   */
  private async scheduleSMS(params: any) {
    // Get user phone number
    const [user] = await db
      .select()
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
        .select()
        .from(users)
        .where(eq(users.id, notification.userId));

      if (!user || !user.email) {
        throw new Error("User email not found");
      }

      // Get email template
      const template = await getEmailTemplate(notification.templateKey, notification.mergeData);
      
      // Add .ics attachment if needed
      let attachments = [];
      if (notification.triggerCode === TriggerCode.BOOK_CONF && notification.appointmentId) {
        const icsContent = await createICSAttachment(notification.appointmentId, "ADD");
        attachments.push({
          filename: "appointment.ics",
          content: icsContent,
          contentType: "text/calendar"
        });
      }

      // Send email
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        attachments
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

export const notificationService = new NotificationService();