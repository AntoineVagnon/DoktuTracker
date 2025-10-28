import 'dotenv/config';
import { db } from './server/db';
import { emailNotifications, appointments, users } from './shared/schema';
import { desc, eq } from 'drizzle-orm';

async function checkNotifications() {
  try {
    console.log('🔍 Checking recent email notifications...\n');

    // Get the most recent appointment for the test user
    const recentAppointments = await db.select()
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .where(eq(users.email, 'gmbcark9hc@osxofulk.com'))
      .orderBy(desc(appointments.createdAt))
      .limit(1);

    if (recentAppointments.length === 0) {
      console.log('❌ No appointments found for gmbcark9hc@osxofulk.com');
      return;
    }

    const appointment = recentAppointments[0].appointments;
    const user = recentAppointments[0].users;

    console.log('✅ Found appointment:');
    console.log('   ID:', appointment.id);
    console.log('   Patient:', user.firstName, user.lastName, '(' + user.email + ')');
    console.log('   Status:', appointment.status);
    console.log('   Created:', appointment.createdAt);
    console.log('   Payment Intent:', appointment.paymentIntentId);
    console.log('');

    // Check for notifications for this appointment
    const notifications = await db.select()
      .from(emailNotifications)
      .where(eq(emailNotifications.appointmentId, appointment.id))
      .orderBy(desc(emailNotifications.createdAt));

    if (notifications.length === 0) {
      console.log('❌ No email notifications found for this appointment');
      console.log('   This means the Stripe webhook may not have been triggered properly');
    } else {
      console.log(`✅ Found ${notifications.length} notification(s):`);
      notifications.forEach((notif, index) => {
        console.log(`\n   Notification ${index + 1}:`);
        console.log('   ID:', notif.id);
        console.log('   Status:', notif.status);
        console.log('   Trigger Code:', notif.triggerCode);
        console.log('   Template Key:', notif.templateKey);
        console.log('   Created:', notif.createdAt);
        console.log('   Scheduled For:', notif.scheduledFor);
        console.log('   Sent At:', notif.sentAt);
        console.log('   Error Message:', notif.errorMessage || 'none');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkNotifications();
