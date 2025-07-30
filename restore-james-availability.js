import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreJamesAvailability() {
  console.log('🔄 Restoring James Rodriguez availability slots...');
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  // Define 30-minute time slots
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];
  
  const slotsToCreate = [];
  
  // Create slots for today and tomorrow
  [today, tomorrow].forEach(date => {
    timeSlots.forEach(startTime => {
      const endTime = addMinutes(startTime, 30);
      slotsToCreate.push({
        id: crypto.randomUUID(),
        doctor_id: 9, // James Rodriguez doctor ID
        date: formatDate(date),
        start_time: startTime,
        end_time: endTime,
        is_available: true
      });
    });
  });
  
  console.log(`📅 Creating ${slotsToCreate.length} availability slots...`);
  
  try {
    // First, delete existing slots for these dates to avoid conflicts
    const { error: deleteError } = await supabase
      .from('doctor_time_slots')
      .delete()
      .eq('doctor_id', 9)
      .in('date', [formatDate(today), formatDate(tomorrow)]);
    
    if (deleteError) {
      console.error('❌ Error deleting existing slots:', deleteError);
    } else {
      console.log('🗑️  Cleared existing slots for dates');
    }
    
    // Insert new slots
    const { data, error } = await supabase
      .from('doctor_time_slots')
      .insert(slotsToCreate);
    
    if (error) {
      console.error('❌ Error creating slots:', error);
      process.exit(1);
    }
    
    console.log('✅ Successfully created availability slots:');
    slotsToCreate.forEach(slot => {
      console.log(`   ${slot.date} ${slot.start_time}-${slot.end_time}`);
    });
    
  } catch (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }
}

function addMinutes(timeStr, minutes) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60);
  const newMins = totalMins % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

restoreJamesAvailability();