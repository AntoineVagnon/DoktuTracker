import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const u = new URL(process.env.DATABASE_URL);
const sql = postgres({
  host: u.hostname,
  port: Number(u.port) || 5432,
  database: u.pathname.slice(1),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password || ''),
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

async function checkBookingNotification() {
  try {
    console.log('✅ Connected to database\n');

    // Get appointment details
    const appointments = await sql`
      SELECT
        a.id,
        a.patient_id,
        a.doctor_id,
        a.appointment_date,
        a.status,
        a.created_at,
        u.email as patient_email,
        u.first_name as patient_first_name,
        u.last_name as patient_last_name
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      WHERE a.id = 191
    `;

    if (appointments.length === 0) {
      console.log('❌ Appointment 191 not found');
      await sql.end();
      return;
    }

    const appointment = appointments[0];
    console.log('📅 Appointment Details:');
    console.log(`   Appointment ID: ${appointment.id}`);
    console.log(`   Patient: ${appointment.patient_first_name} ${appointment.patient_last_name}`);
    console.log(`   Email: ${appointment.patient_email}`);
    console.log(`   Doctor ID: ${appointment.doctor_id}`);
    console.log(`   Date: ${appointment.appointment_date}`);
    console.log(`   Status: ${appointment.status}`);
    console.log(`   Created: ${appointment.created_at}\n`);

    // Check for booking notifications (B1, B3)
    const notifications = await sql`
      SELECT
        id,
        trigger_code,
        user_id,
        appointment_id,
        status,
        error_message,
        sent_at,
        created_at
      FROM email_notifications
      WHERE appointment_id = ${appointment.id}
      ORDER BY created_at ASC
    `;

    console.log('📬 Booking Notifications:');
    console.log(`   Total Count: ${notifications.length}\n`);

    if (notifications.length === 0) {
      console.log('⚠️  NO NOTIFICATIONS FOUND');
      console.log('   This is expected if payment has not been completed yet.');
      console.log('   B1 (Payment Pending) - sent when payment initiated');
      console.log('   B3 (Booking Confirmed) - sent when payment succeeds\n');
    } else {
      // Group by trigger code
      const byTrigger = {};
      notifications.forEach(n => {
        if (!byTrigger[n.trigger_code]) {
          byTrigger[n.trigger_code] = [];
        }
        byTrigger[n.trigger_code].push(n);
      });

      Object.keys(byTrigger).forEach(triggerCode => {
        const notifsForTrigger = byTrigger[triggerCode];
        console.log(`   ${triggerCode}: ${notifsForTrigger.length} notification(s)`);

        if (notifsForTrigger.length > 1) {
          console.log(`   ❌ DUPLICATE DETECTED for ${triggerCode}!`);
        } else {
          console.log(`   ✅ No duplicates for ${triggerCode}`);
        }

        notifsForTrigger.forEach((n, idx) => {
          console.log(`     [${idx + 1}] ID: ${n.id}`);
          console.log(`         Status: ${n.status}`);
          console.log(`         Sent At: ${n.sent_at || 'Pending'}`);
          console.log(`         Created: ${n.created_at}`);
          console.log(`         Error: ${n.error_message || 'None'}`);
        });
        console.log('');
      });
    }

    // Check for ANY duplicates for this appointment
    const duplicateCheck = await sql`
      SELECT
        appointment_id,
        trigger_code,
        user_id,
        COUNT(*) as count
      FROM email_notifications
      WHERE appointment_id = ${appointment.id}
      GROUP BY appointment_id, trigger_code, user_id
      HAVING COUNT(*) > 1
    `;

    console.log('🔍 Duplicate Check (Unique Constraint Validation):');
    if (duplicateCheck.length === 0) {
      console.log('   ✅ No duplicate notifications found');
      console.log('   ✅ Unique constraint working correctly');
    } else {
      console.log('   ❌ Duplicates detected:');
      duplicateCheck.forEach(row => {
        console.log(`      Appointment ${row.appointment_id}, ${row.trigger_code}: ${row.count} notifications`);
      });
    }

    // Check for ICS errors
    console.log('\n📎 ICS Attachment Check:');
    const icsErrors = await sql`
      SELECT
        id,
        trigger_code,
        error_message,
        created_at
      FROM email_notifications
      WHERE appointment_id = ${appointment.id}
        AND trigger_code = 'B3'
        AND error_message LIKE '%Cannot convert%'
    `;

    if (icsErrors.length === 0) {
      console.log('   ✅ No ICS attachment errors detected');
    } else {
      console.log('   ❌ ICS errors found:');
      icsErrors.forEach(err => {
        console.log(`      ID: ${err.id}`);
        console.log(`      Error: ${err.error_message}`);
        console.log(`      Created: ${err.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkBookingNotification();
