#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bXJrdm9vcWpieHB0cWpxeGlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzI4OTU2NCwiZXhwIjoyMDQyODY1NTY0fQ.w8fBXnN7qxP-EpZ5yNEq7vL00bvUgOWMWIDkkU3X7bk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('=== CHECKING APPOINTMENT 195 ===\n');

// Get appointment details
const { data: appointment, error: apptError } = await supabase
  .from('appointments')
  .select(`
    *,
    patient:users!appointments_patient_id_fkey(id, email, first_name, last_name),
    doctor:doctors(id, user_id, users(id, email, first_name, last_name))
  `)
  .eq('id', 195)
  .single();

if (apptError) {
  console.error('Error fetching appointment:', apptError);
  process.exit(1);
}

console.log('📅 Appointment Details:');
console.log(`   ID: ${appointment.id}`);
console.log(`   Patient: ${appointment.patient.first_name} ${appointment.patient.last_name} (${appointment.patient.email})`);
console.log(`   Doctor: ${appointment.doctor.users.first_name} ${appointment.doctor.users.last_name}`);
console.log(`   Date/Time: ${appointment.appointment_date}`);
console.log(`   Status: ${appointment.status}`);
console.log(`   Created: ${appointment.created_at}`);

// Check for related notifications
console.log('\n📧 Checking Notifications:');

const { data: notifications, error: notifError } = await supabase
  .from('notifications')
  .select('*')
  .or(`merge_data->appointment_id.eq.195,merge_data->appointmentId.eq.195`)
  .order('created_at', { ascending: false });

if (notifError) {
  console.error('Error fetching notifications:', notifError);
} else if (!notifications || notifications.length === 0) {
  console.log('   ❌ No notifications found for appointment 195');
} else {
  console.log(`   Found ${notifications.length} notification(s):\n`);
  notifications.forEach(notif => {
    console.log(`   - ID: ${notif.id}`);
    console.log(`     Trigger: ${notif.trigger_code}`);
    console.log(`     User ID: ${notif.user_id}`);
    console.log(`     Status: ${notif.status}`);
    console.log(`     Scheduled: ${notif.scheduled_for}`);
    console.log(`     Created: ${notif.created_at}`);
    console.log(`     Sent: ${notif.sent_at || 'Not sent'}`);
    console.log('');
  });
}

console.log('\n🔍 Expected Notifications:');
console.log('   1. APPOINTMENT.CONFIRMATION (at booking)');
console.log('   2. APPOINTMENT.REMINDER_24H (24 hours before)');
console.log('   3. APPOINTMENT.REMINDER_1H (1 hour before)');
console.log('   4. APPOINTMENT.REMINDER_5MIN (5 minutes before) ← MISSING?');
