import cron from 'node-cron';
import { db } from '../db';
import { appointments, users, doctors } from '../../shared/schema';
import { eq, and, gte, lt, sql } from 'drizzle-orm';
import { TriggerCode } from '../services/notificationService';

// Import notification service - will be initialized in index.ts
let notificationService: any;

export function initializeNotificationService(service: any) {
  notificationService = service;
}

/**
 * B4: 24-Hour Appointment Reminder
 * Runs every hour to find appointments 24 hours away
 */
export function start24HourReminders() {
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running 24-hour appointment reminder job...');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    try {
      // Find appointments between 24-25 hours from now with status 'confirmed'
      const upcomingAppointments = await db
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          doctorId: appointments.doctorId,
          scheduledAt: appointments.scheduledAt,
          patientFirstName: users.firstName,
          patientLastName: users.lastName,
          patientEmail: users.email,
        })
        .from(appointments)
        .innerJoin(users, eq(appointments.patientId, users.id))
        .where(
          and(
            gte(appointments.scheduledAt, in24Hours),
            lt(appointments.scheduledAt, in25Hours),
            eq(appointments.status, 'confirmed')
          )
        );

      console.log(`[CRON] Found ${upcomingAppointments.length} appointments for 24h reminders`);

      for (const appointment of upcomingAppointments) {
        // Get doctor details
        const [doctorDetails] = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            specialty: doctors.specialty,
          })
          .from(doctors)
          .innerJoin(users, eq(doctors.userId, users.id))
          .where(eq(doctors.id, appointment.doctorId));

        if (!doctorDetails) {
          console.error(`[CRON] Doctor not found for appointment ${appointment.id}`);
          continue;
        }

        // Schedule B4 notification
        await notificationService.scheduleNotification({
          userId: appointment.patientId,
          appointmentId: appointment.id,
          triggerCode: TriggerCode.BOOKING_REMINDER_24H,
          scheduledFor: new Date(),
          mergeData: {
            patient_first_name: appointment.patientFirstName,
            appointment_datetime_local: appointment.scheduledAt.toLocaleString('en-US', {
              dateStyle: 'full',
              timeStyle: 'short'
            }),
            doctor_name: `Dr. ${doctorDetails.lastName}`,
            doctor_specialty: doctorDetails.specialty || 'Medical Specialist',
            join_link: `${process.env.CLIENT_URL || 'https://doktu.co'}/appointments/${appointment.id}/join`,
            reschedule_link: `${process.env.CLIENT_URL || 'https://doktu.co'}/appointments/${appointment.id}/reschedule`
          }
        });

        console.log(`[CRON] Scheduled 24h reminder for appointment ${appointment.id}`);
      }
    } catch (error) {
      console.error('[CRON] 24h reminder job error:', error);
    }
  });

  console.log('[CRON] 24-hour appointment reminder job initialized (runs hourly)');
}

/**
 * B5: 1-Hour Appointment Reminder
 * Runs every 5 minutes to find appointments 1 hour away
 */
export function start1HourReminders() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Running 1-hour appointment reminder job...');

    const now = new Date();
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in65Minutes = new Date(now.getTime() + 65 * 60 * 1000);

    try {
      const upcomingAppointments = await db
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          doctorId: appointments.doctorId,
          scheduledAt: appointments.scheduledAt,
          patientFirstName: users.firstName,
          patientLastName: users.lastName,
          patientEmail: users.email,
        })
        .from(appointments)
        .innerJoin(users, eq(appointments.patientId, users.id))
        .where(
          and(
            gte(appointments.scheduledAt, in1Hour),
            lt(appointments.scheduledAt, in65Minutes),
            eq(appointments.status, 'confirmed')
          )
        );

      console.log(`[CRON] Found ${upcomingAppointments.length} appointments for 1h reminders`);

      for (const appointment of upcomingAppointments) {
        // Get doctor details
        const [doctorDetails] = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            specialty: doctors.specialty,
          })
          .from(doctors)
          .innerJoin(users, eq(doctors.userId, users.id))
          .where(eq(doctors.id, appointment.doctorId));

        if (!doctorDetails) {
          console.error(`[CRON] Doctor not found for appointment ${appointment.id}`);
          continue;
        }

        // Schedule B5 notification
        await notificationService.scheduleNotification({
          userId: appointment.patientId,
          appointmentId: appointment.id,
          triggerCode: TriggerCode.BOOKING_REMINDER_1H,
          scheduledFor: new Date(),
          mergeData: {
            patient_first_name: appointment.patientFirstName,
            appointment_datetime_local: appointment.scheduledAt.toLocaleString('en-US', {
              dateStyle: 'full',
              timeStyle: 'short'
            }),
            doctor_name: `Dr. ${doctorDetails.lastName}`,
            doctor_specialty: doctorDetails.specialty || 'Medical Specialist',
            join_link: `${process.env.CLIENT_URL || 'https://doktu.co'}/appointments/${appointment.id}/join`,
            preparation_checklist: 'Make sure you have a stable internet connection, test your camera and microphone, and have your health documents ready.'
          }
        });

        console.log(`[CRON] Scheduled 1h reminder for appointment ${appointment.id}`);
      }
    } catch (error) {
      console.error('[CRON] 1h reminder job error:', error);
    }
  });

  console.log('[CRON] 1-hour appointment reminder job initialized (runs every 5 minutes)');
}

/**
 * B6: Live Imminent Notification
 * Runs every minute to find appointments starting in 5 minutes
 */
export function startImminentNotifications() {
  cron.schedule('* * * * *', async () => {
    console.log('[CRON] Running live imminent notification job...');

    const now = new Date();
    const in5Minutes = new Date(now.getTime() + 5 * 60 * 1000);
    const in6Minutes = new Date(now.getTime() + 6 * 60 * 1000);

    try {
      const imminentAppointments = await db
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          doctorId: appointments.doctorId,
          scheduledAt: appointments.scheduledAt,
          patientFirstName: users.firstName,
          patientLastName: users.lastName,
          patientEmail: users.email,
        })
        .from(appointments)
        .innerJoin(users, eq(appointments.patientId, users.id))
        .where(
          and(
            gte(appointments.scheduledAt, in5Minutes),
            lt(appointments.scheduledAt, in6Minutes),
            eq(appointments.status, 'confirmed')
          )
        );

      console.log(`[CRON] Found ${imminentAppointments.length} imminent appointments`);

      for (const appointment of imminentAppointments) {
        // Get doctor details
        const [doctorDetails] = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            specialty: doctors.specialty,
          })
          .from(doctors)
          .innerJoin(users, eq(doctors.userId, users.id))
          .where(eq(doctors.id, appointment.doctorId));

        if (!doctorDetails) {
          console.error(`[CRON] Doctor not found for appointment ${appointment.id}`);
          continue;
        }

        // Schedule B6 notification
        await notificationService.scheduleNotification({
          userId: appointment.patientId,
          appointmentId: appointment.id,
          triggerCode: TriggerCode.BOOKING_LIVE_IMMINENT,
          scheduledFor: new Date(),
          mergeData: {
            patient_first_name: appointment.patientFirstName,
            doctor_name: `Dr. ${doctorDetails.lastName}`,
            join_link: `${process.env.CLIENT_URL || 'https://doktu.co'}/appointments/${appointment.id}/join`
          }
        });

        console.log(`[CRON] Scheduled imminent notification for appointment ${appointment.id}`);
      }
    } catch (error) {
      console.error('[CRON] Live imminent job error:', error);
    }
  });

  console.log('[CRON] Live imminent notification job initialized (runs every minute)');
}

/**
 * Initialize all appointment reminder cron jobs
 */
export function initializeAppointmentReminders(service: any) {
  initializeNotificationService(service);

  start24HourReminders();
  start1HourReminders();
  startImminentNotifications();

  console.log('[CRON] All appointment reminder jobs initialized successfully');
}
