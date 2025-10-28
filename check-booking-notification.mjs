/**
 * Check recent booking and notification status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking recent bookings and notifications...\n');

// Check recent bookings
const { data: bookings, error: bookingError } = await supabase
  .from('bookings')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

if (bookingError) {
  console.error('❌ Error fetching bookings:', bookingError);
} else {
  console.log('📅 Recent Bookings:');
  console.log('━'.repeat(80));
  bookings?.forEach((booking, index) => {
    console.log(`${index + 1}. Booking ID: ${booking.id}`);
    console.log(`   Patient ID: ${booking.patient_id}`);
    console.log(`   Doctor ID: ${booking.doctor_id}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Appointment Time: ${booking.appointment_time}`);
    console.log(`   Created: ${booking.created_at}`);
    console.log('');
  });
}

// Check recent notifications
const { data: notifications, error: notifError } = await supabase
  .from('notifications')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (notifError) {
  console.error('❌ Error fetching notifications:', notifError);
} else {
  console.log('\n📧 Recent Notifications:');
  console.log('━'.repeat(80));
  notifications?.forEach((notif, index) => {
    console.log(`${index + 1}. Notification ID: ${notif.id}`);
    console.log(`   User ID: ${notif.user_id}`);
    console.log(`   Trigger Code: ${notif.trigger_code}`);
    console.log(`   Template Key: ${notif.template_key}`);
    console.log(`   Status: ${notif.status}`);
    console.log(`   Scheduled For: ${notif.scheduled_for}`);
    console.log(`   Created: ${notif.created_at}`);
    console.log('');
  });
}

// Check recent email notifications
const { data: emails, error: emailError } = await supabase
  .from('email_notifications')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (emailError) {
  console.error('❌ Error fetching email notifications:', emailError);
} else {
  console.log('\n✉️ Recent Email Notifications:');
  console.log('━'.repeat(80));
  emails?.forEach((email, index) => {
    console.log(`${index + 1}. Email ID: ${email.id}`);
    console.log(`   Notification ID: ${email.notification_id}`);
    console.log(`   To: ${email.to_email}`);
    console.log(`   Subject: ${email.subject}`);
    console.log(`   Status: ${email.status}`);
    console.log(`   Sent At: ${email.sent_at || 'Not sent'}`);
    console.log(`   Error: ${email.error_message || 'None'}`);
    console.log(`   Created: ${email.created_at}`);
    console.log('');
  });
}

// Check if there are any users without notification preferences
const { data: users, error: userError } = await supabase
  .from('users')
  .select('id, email, first_name, last_name, created_at')
  .order('created_at', { ascending: false })
  .limit(5);

if (!userError && users) {
  console.log('\n👥 Recent Users (checking notification preferences):');
  console.log('━'.repeat(80));

  for (const user of users) {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log(`User: ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Has Preferences: ${prefs ? '✅ Yes' : '❌ No'}`);
    if (prefs) {
      console.log(`   Email Enabled: ${prefs.email_enabled}`);
      console.log(`   Locale: ${prefs.locale}`);
    }
    console.log('');
  }
}

console.log('\n━'.repeat(80));
console.log('✅ Check complete');
