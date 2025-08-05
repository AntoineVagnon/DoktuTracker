import { db } from "./server/db";
import { users, appointments } from "./shared/schema";
import { eq } from "drizzle-orm";

async function testNotificationSystem() {
  try {
    console.log("🔔 Testing notification system...");
    
    // Dynamic import of notification service
    const { notificationService, TriggerCode } = await import("./server/services/notificationService");
    
    // Find a test patient
    const [testPatient] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'patient'))
      .limit(1);
    
    if (!testPatient) {
      console.log("❌ No patient found for testing");
      return;
    }
    
    console.log(`✅ Found test patient: ${testPatient.email}`);
    
    // Find a test appointment
    const [testAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, testPatient.id))
      .limit(1);
    
    if (!testAppointment) {
      console.log("❌ No appointment found for testing");
      return;
    }
    
    console.log(`✅ Found test appointment: ID ${testAppointment.id}`);
    
    // Test sending an appointment confirmation notification
    console.log("\n🚀 Triggering appointment confirmation notification...");
    
    await notificationService.scheduleNotification({
      userId: testPatient.id,
      appointmentId: testAppointment.id,
      triggerCode: TriggerCode.BOOK_CONF,
      mergeData: {
        patientName: testPatient.firstName || 'Patient',
        appointmentDate: testAppointment.appointmentDate
      }
    });
    
    console.log("✅ Notification triggered successfully!");
    
    // Check if notification was created
    const { emailNotifications } = await import("./shared/schema");
    const [notification] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.userId, testPatient.id))
      .orderBy(emailNotifications.createdAt)
      .limit(1);
    
    if (notification) {
      console.log("\n📧 Notification details:");
      console.log(`  - ID: ${notification.id}`);
      console.log(`  - Status: ${notification.status}`);
      console.log(`  - Template: ${notification.templateKey}`);
      console.log(`  - Scheduled for: ${notification.scheduledFor}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error testing notification system:", error);
    process.exit(1);
  }
}

testNotificationSystem();