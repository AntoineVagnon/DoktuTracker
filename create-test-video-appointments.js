// Simple script to create test video appointments
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - VITE_SUPABASE_URL');
  if (!supabaseAnonKey) console.error('  - VITE_SUPABASE_ANON_KEY');
  console.error('Please set these in your Replit secrets.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestVideoAppointments() {
  try {
    console.log('Creating test video appointments...');
    
    // Get patient user ID for patient@test40.com
    const { data: patient, error: patientError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'patient@test40.com')
      .single();
      
    if (patientError || !patient) {
      console.error('Patient not found:', patientError);
      return;
    }
    
    console.log('Found patient:', patient.id);
    
    // Get next available slots for Dr. James Rodriguez (doctor_id = 9)
    const { data: slots, error: slotsError } = await supabase
      .from('doctor_time_slots')
      .select('*')
      .eq('doctor_id', 9)
      .eq('is_available', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(3);
      
    if (slotsError || !slots || slots.length === 0) {
      console.error('No available slots found:', slotsError);
      return;
    }
    
    console.log(`Found ${slots.length} available slots`);
    
    // Create appointments for each slot
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const appointmentDate = new Date(`${slot.date}T${slot.start_time}Z`);
      
      const appointmentData = {
        patient_id: patient.id,
        doctor_id: 9,
        appointment_date: appointmentDate.toISOString(),
        timeslot_id: slot.id,
        status: 'confirmed',
        type: 'video',
        payment_status: 'paid',
        payment_intent_id: `test_video_${Date.now()}_${i}`,
        payment_amount: 50.00,
        currency: 'eur',
        zoom_meeting_id: `test-meeting-${Date.now()}-${i}`,
        zoom_join_url: `https://zoom.us/j/test${Date.now()}${i}`,
        zoom_start_url: `https://zoom.us/s/test${Date.now()}${i}`,
      };
      
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();
        
      if (appointmentError) {
        console.error(`Error creating appointment ${i + 1}:`, appointmentError);
        continue;
      }
      
      // Mark slot as unavailable
      const { error: updateError } = await supabase
        .from('doctor_time_slots')
        .update({ is_available: false })
        .eq('id', slot.id);
        
      if (updateError) {
        console.error(`Error updating slot ${i + 1}:`, updateError);
      }
      
      console.log(`✅ Created appointment ${i + 1}:`, {
        id: appointment.id,
        date: appointment.appointment_date,
        type: appointment.type,
        zoom_url: appointment.zoom_join_url,
      });
    }
    
    console.log('✅ Successfully created test video appointments!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
createTestVideoAppointments();