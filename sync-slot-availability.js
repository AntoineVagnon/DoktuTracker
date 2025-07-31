#!/usr/bin/env node

// Synchronize slot availability with confirmed appointments
// This fixes the bug where paid appointments don't update slot availability

const API_BASE = 'http://localhost:5000';

async function syncSlotAvailability() {
  console.log('🔄 Synchronizing slot availability with confirmed appointments...');
  
  try {
    // 1. Get all appointments for James Rodriguez (doctorId=9)
    console.log('\n1️⃣ Fetching appointments...');
    const appointmentsResponse = await fetch(`${API_BASE}/api/appointments?doctorId=9`);
    const appointments = await appointmentsResponse.json();
    
    console.log(`Found ${appointments.length} appointments for doctorId=9`);
    
    // 2. Get all available slots for James Rodriguez
    console.log('\n2️⃣ Fetching available slots...');
    const slotsResponse = await fetch(`${API_BASE}/api/doctors/9/slots`);
    const slots = await slotsResponse.json();
    
    console.log(`Found ${slots.length} total slots for doctorId=9`);
    
    // 3. Find appointments that need slot synchronization
    const paidAppointments = appointments.filter(apt => apt.status === 'paid');
    console.log(`Found ${paidAppointments.length} paid appointments that should have slots marked unavailable`);
    
    // 4. Check each paid appointment for slot conflicts
    for (const appointment of paidAppointments) {
      const appointmentDate = new Date(appointment.appointmentDate);
      const appointmentDateString = appointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const appointmentTimeString = appointmentDate.toTimeString().slice(0, 8); // HH:MM:SS
      
      console.log(`\n📅 Checking appointment ${appointment.id}:`);
      console.log(`   Date: ${appointmentDateString}`);
      console.log(`   Time: ${appointmentTimeString}`);
      console.log(`   Status: ${appointment.status}`);
      
      // Find matching slot
      const matchingSlot = slots.find(slot => 
        slot.date === appointmentDateString && 
        slot.startTime === appointmentTimeString &&
        slot.isAvailable === true
      );
      
      if (matchingSlot) {
        console.log(`   ❌ ISSUE: Slot ${matchingSlot.id} is still marked as available!`);
        console.log(`   🔧 This slot should be marked unavailable`);
        
        // Mark the slot as unavailable manually using direct API call
        const updateResponse = await fetch(`${API_BASE}/api/time-slots/${matchingSlot.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAvailable: false })
        });
        
        if (updateResponse.ok) {
          console.log(`   ✅ Fixed: Slot ${matchingSlot.id} marked as unavailable`);
        } else {
          console.log(`   ❌ Failed to update slot: ${await updateResponse.text()}`);
        }
      } else {
        console.log(`   ✅ OK: No conflicting available slot found`);
      }
    }
    
    // 5. Summary
    console.log('\n📊 SYNCHRONIZATION SUMMARY:');
    console.log(`Total appointments: ${appointments.length}`);
    console.log(`Paid appointments: ${paidAppointments.length}`);
    console.log(`Available slots before: ${slots.filter(s => s.isAvailable).length}`);
    
    // Fetch updated slots to verify
    const updatedSlotsResponse = await fetch(`${API_BASE}/api/doctors/9/slots`);
    const updatedSlots = await updatedSlotsResponse.json();
    console.log(`Available slots after: ${updatedSlots.filter(s => s.isAvailable).length}`);
    
    console.log('\n🎉 Slot availability synchronization completed!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

// Run the sync
syncSlotAvailability();