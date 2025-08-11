import { db } from "./server/db";
import { notificationService, TriggerCode } from "./server/services/notificationService";
import { appointments, users, doctors } from "./shared/schema";
import { eq } from "drizzle-orm";

async function sendMissingNotification() {
  try {
    // Get appointment details
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, 31));
    
    if (!appointment) {
      console.log("❌ Appointment not found");
      return;
    }
    
    // Get patient details
    const [patient] = await db
      .select()
      .from(users)
      .where(eq(users.id, appointment.patientId));
    
    // Get doctor details
    const [doctor] = await db
      .select({
        user: users,
        doctor: doctors
      })
      .from(doctors)
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.id, appointment.doctorId));
    
    console.log("📋 Appointment details:");
    console.log(`  - Patient: ${patient?.email} (${patient?.firstName} ${patient?.lastName})`);
    console.log(`  - Doctor: ${doctor?.user?.firstName} ${doctor?.user?.lastName}`);
    console.log(`  - Date: ${appointment.appointmentDate}`);
    console.log(`  - Status: ${appointment.status}`);
    
    // Send the notification
    console.log("\n📧 Sending confirmation email...");
    
    await notificationService.scheduleNotification({
      userId: appointment.patientId,
      appointmentId: appointment.id,
      triggerCode: TriggerCode.BOOK_CONF,
      scheduledFor: new Date(),
      mergeData: {
        patientName: `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || patient?.email,
        doctorName: `${doctor?.user?.firstName || ''} ${doctor?.user?.lastName || ''}`.trim(),
        appointmentDate: appointment.appointmentDate,
        price: appointment.price
      }
    });
    
    console.log("✅ Notification scheduled successfully!");
    
    // Process the notification queue immediately
    console.log("🚀 Processing notification queue...");
    await notificationService.processNotificationQueue();
    
    console.log("✅ Email should be sent!");
    
  } catch (error) {
    console.error("❌ Error sending notification:", error);
  }
  process.exit(0);
}

sendMissingNotification();
