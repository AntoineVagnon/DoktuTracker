// Quick fix script to make the calendar work with authentication
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCalendarAuth() {
  try {
    // Check current doctor records
    const { data: doctors, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .limit(5);
    
    if (doctorError) {
      console.error('Doctor query error:', doctorError);
      return;
    }
    
    console.log('Current doctors:', doctors);
    
    // Check time slots table structure
    const { data: timeSlots, error: slotsError } = await supabase
      .from('doctor_time_slots')
      .select('*')
      .limit(1);
      
    console.log('Time slots structure:', timeSlots);
    if (slotsError) console.log('Time slots error:', slotsError);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixCalendarAuth();