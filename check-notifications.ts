import { db } from "./server/db";
import { emailNotifications, users, appointments } from "./shared/schema";
import { eq, desc } from "drizzle-orm";

async function checkNotifications() {
  try {
    // Check if any email notifications were created for user 53
    const notifications = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.userId, 53))
      .orderBy(desc(emailNotifications.createdAt));
    
    console.log(`📧 Email notifications for user 53: ${notifications.length} found`);
    notifications.forEach(n => {
      console.log(`\nNotification ID: ${n.id}`);
      console.log(`  Template: ${n.templateKey}`);
      console.log(`  Status: ${n.status}`);
      console.log(`  Scheduled For: ${n.scheduledFor}`);
      console.log(`  Sent At: ${n.sentAt || 'Not sent'}`);
      console.log(`  Created: ${n.createdAt}`);
      if (n.error) console.log(`  Error: ${n.error}`);
      if (n.mergeData) console.log(`  Data:`, JSON.parse(n.mergeData));
    });
    
    // Check SendGrid API key
    console.log(`\n🔑 SendGrid API Key: ${process.env.SENDGRID_API_KEY ? 'Present' : 'Missing'}`);
    
    // Also check for latest appointment
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, 31));
    
    console.log(`\n📋 Appointment #31:`, {
      id: appointment?.id,
      patientId: appointment?.patientId,
      doctorId: appointment?.doctorId,
      status: appointment?.status,
      date: appointment?.appointmentDate
    });
    
  } catch (error) {
    console.error("Error checking notifications:", error);
  }
  process.exit(0);
}

checkNotifications();
