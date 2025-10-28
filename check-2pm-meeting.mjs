#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bXJrdm9vcWpieHB0cWpxeGlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzI4OTU2NCwiZXhwIjoyMDQyODY1NTY0fQ.w8fBXnN7qxP-EpZ5yNEq7vL00bvUgOWMWIDkkU3X7bk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('=== CHECKING 2 PM MEETING ===\n');

// Get today's date
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

console.log('Current time:', new Date().toISOString());
console.log('Looking for appointments on:', todayStr, '\n');

// Find appointment with avagnonperso@gmail.com around 2 PM today
const { data: appointments, error } = await supabase
  .from('appointments')
  .select(`
    *,
    patient:users!appointments_patient_id_fkey(id, email, first_name, last_name),
    doctor:doctors(id, specialty, user_id, users(id, email, first_name, last_name))
  `)
  .gte('appointment_date', `${todayStr}T13:00:00`)
  .lte('appointment_date', `${todayStr}T15:00:00`)
  .order('appointment_date', { ascending: false });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Found ${appointments.length} appointment(s) between 1 PM and 3 PM:\n`);

appointments.forEach(apt => {
  const appointmentDate = new Date(apt.appointment_date);
  const now = new Date();
  const minutesSinceStart = Math.floor((now - appointmentDate) / (1000 * 60));
  const sixtyMinutesAfter = new Date(appointmentDate.getTime() + 60 * 60 * 1000);
  const shouldShowBanner = now < sixtyMinutesAfter;

  console.log('📅 Appointment ID:', apt.id);
  console.log('   Patient:', apt.patient?.email);
  console.log('   Doctor:', apt.doctor?.users?.first_name, apt.doctor?.users?.last_name);
  console.log('   Scheduled time:', appointmentDate.toLocaleString());
  console.log('   Status:', apt.status);
  console.log('   Minutes since start:', minutesSinceStart);
  console.log('   60 min window ends at:', sixtyMinutesAfter.toLocaleString());
  console.log('   Should show banner:', shouldShowBanner ? 'YES ✓' : 'NO ✗');
  console.log('');
});
