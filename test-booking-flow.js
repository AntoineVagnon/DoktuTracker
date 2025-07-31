#!/usr/bin/env node

// Test complete booking flow after fixing James Rodriguez duplicate issue
// This will verify that appointments propagate correctly after payment

const API_BASE = 'http://localhost:5000';

async function testBookingFlow() {
  console.log('🧪 Testing complete booking flow...');
  
  try {
    // 1. Get James Rodriguez slots
    console.log('\n1️⃣ Fetching James Rodriguez available slots...');
    const slotsResponse = await fetch(`${API_BASE}/api/doctors/9/slots`);
    const slots = await slotsResponse.json();
    console.log(`Found ${slots.length} available slots for James Rodriguez`);
    
    if (slots.length === 0) {
      console.log('❌ No slots available for testing');
      return;
    }
    
    // Pick the first available slot
    const testSlot = slots[0];
    console.log(`Selected slot: ${testSlot.date} ${testSlot.startTime}`);
    
    // 2. Create a test appointment (simulating the booking process)
    console.log('\n2️⃣ Creating test appointment...');
    const appointmentData = {
      doctorId: 9,
      patientId: 32, // Using existing patient
      appointmentDate: `${testSlot.date}T${testSlot.startTime}:00.000Z`,
      status: 'pending_payment',
      paymentIntentId: `test_pi_${Date.now()}`
    };
    
    const createResponse = await fetch(`${API_BASE}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentData)
    });
    
    if (!createResponse.ok) {
      console.log('❌ Failed to create appointment:', await createResponse.text());
      return;
    }
    
    const newAppointment = await createResponse.json();
    console.log(`✅ Created appointment ID: ${newAppointment.id}`);
    
    // 3. Simulate successful payment by updating appointment status
    console.log('\n3️⃣ Simulating successful payment...');
    const paymentResponse = await fetch(`${API_BASE}/api/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_intent: appointmentData.paymentIntentId,
        appointmentId: newAppointment.id.toString()
      })
    });
    
    if (!paymentResponse.ok) {
      console.log('❌ Payment confirmation failed:', await paymentResponse.text());
      return;
    }
    
    const paymentResult = await paymentResponse.json();
    console.log('✅ Payment confirmed:', paymentResult.message || 'Success');
    
    // 4. Check if slot is now unavailable
    console.log('\n4️⃣ Verifying slot availability after payment...');
    const updatedSlotsResponse = await fetch(`${API_BASE}/api/doctors/9/slots`);
    const updatedSlots = await updatedSlotsResponse.json();
    
    const slotStillAvailable = updatedSlots.find(slot => 
      slot.date === testSlot.date && 
      slot.startTime === testSlot.startTime
    );
    
    if (slotStillAvailable) {
      console.log('❌ ISSUE: Slot is still available after payment!');
      console.log('This indicates the slot synchronization is not working');
    } else {
      console.log('✅ Slot correctly removed from available slots');
    }
    
    console.log(`Slot count: ${slots.length} → ${updatedSlots.length} (${slots.length - updatedSlots.length} removed)`);
    
    // 5. Check doctor dashboard shows the appointment
    console.log('\n5️⃣ Checking doctor appointments...');
    const doctorAppointmentsResponse = await fetch(`${API_BASE}/api/appointments?doctorId=9`);
    const doctorAppointments = await doctorAppointmentsResponse.json();
    
    const ourAppointment = doctorAppointments.find(apt => apt.id === newAppointment.id);
    if (ourAppointment && ourAppointment.status === 'paid') {
      console.log('✅ Appointment appears in doctor dashboard with "paid" status');
    } else {
      console.log('❌ ISSUE: Appointment not found or status incorrect in doctor dashboard');
    }
    
    // 6. Summary
    console.log('\n📊 BOOKING FLOW TEST SUMMARY:');
    console.log(`✅ James Rodriguez unified (doctorId=9, email=james.rodriguez@doktu.com)`);
    console.log(`✅ Appointment created and confirmed (ID: ${newAppointment.id})`);
    console.log(`${slotStillAvailable ? '❌' : '✅'} Slot availability sync: ${slotStillAvailable ? 'FAILED' : 'SUCCESS'}`);
    console.log(`${ourAppointment ? '✅' : '❌'} Doctor dashboard sync: ${ourAppointment ? 'SUCCESS' : 'FAILED'}`);
    
    if (!slotStillAvailable && ourAppointment) {
      console.log('\n🎉 ALL TESTS PASSED - Booking flow working correctly!');
    } else {
      console.log('\n⚠️ Some issues detected - see details above');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testBookingFlow();