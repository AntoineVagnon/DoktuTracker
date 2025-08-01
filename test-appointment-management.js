// Test appointment rescheduling and cancellation functionality

const fetch = require('node-fetch');

// Get cookie from test_cookies.txt
const fs = require('fs');
const cookie = fs.readFileSync('test_cookies.txt', 'utf8').trim();

const API_BASE = 'http://localhost:5000';

async function testAppointmentManagement() {
  console.log('Testing appointment management functionality...\n');

  try {
    // 1. Get user's appointments
    console.log('1. Fetching user appointments...');
    const appointmentsRes = await fetch(`${API_BASE}/api/appointments`, {
      headers: { 'Cookie': cookie }
    });
    
    const appointments = await appointmentsRes.json();
    console.log(`Found ${appointments.length} appointments`);
    
    if (appointments.length === 0) {
      console.log('No appointments found to test with.');
      return;
    }
    
    // Find a future appointment that can be rescheduled
    const futureAppointments = appointments.filter(app => {
      const appointmentTime = new Date(app.appointmentDate);
      const now = new Date();
      const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil > 1 && app.status !== 'cancelled';
    });
    
    if (futureAppointments.length === 0) {
      console.log('No future appointments found that can be rescheduled (need > 1 hour before appointment).');
      return;
    }
    
    const testAppointment = futureAppointments[0];
    console.log(`\nTesting with appointment ID ${testAppointment.id}:`);
    console.log(`- Doctor: ${testAppointment.doctor.user.firstName} ${testAppointment.doctor.user.lastName}`);
    console.log(`- Date/Time: ${new Date(testAppointment.appointmentDate).toLocaleString()}`);
    console.log(`- Status: ${testAppointment.status}`);
    console.log(`- Reschedule count: ${testAppointment.rescheduleCount || 0}`);
    
    // 2. Get available slots for rescheduling
    console.log(`\n2. Fetching available slots for doctor ${testAppointment.doctorId}...`);
    const slotsRes = await fetch(`${API_BASE}/api/doctors/${testAppointment.doctorId}/slots/available`, {
      headers: { 'Cookie': cookie }
    });
    
    const availableSlots = await slotsRes.json();
    console.log(`Found ${availableSlots.length} available slots`);
    
    if (availableSlots.length === 0) {
      console.log('No available slots found for rescheduling.');
      return;
    }
    
    // Pick a different slot for rescheduling
    const newSlot = availableSlots.find(slot => {
      const slotDate = new Date(`${slot.date}T${slot.startTime}`);
      return slotDate > new Date();
    });
    
    if (!newSlot) {
      console.log('No future slots available for rescheduling.');
      return;
    }
    
    console.log(`\nSelected new slot for rescheduling:`);
    console.log(`- Date: ${newSlot.date}`);
    console.log(`- Time: ${newSlot.startTime} - ${newSlot.endTime}`);
    
    // 3. Test appointment changes history (should be empty initially)
    console.log(`\n3. Checking appointment changes history...`);
    const changesRes = await fetch(`${API_BASE}/api/appointments/${testAppointment.id}/changes`, {
      headers: { 'Cookie': cookie }
    });
    
    if (changesRes.ok) {
      const changes = await changesRes.json();
      console.log(`Found ${changes.length} change(s) in history`);
      changes.forEach((change, index) => {
        console.log(`\nChange ${index + 1}:`);
        console.log(`- Action: ${change.action}`);
        console.log(`- By: ${change.actorRole}`);
        console.log(`- Reason: ${change.reason}`);
        console.log(`- Date: ${new Date(change.createdAt).toLocaleString()}`);
      });
    }
    
    // 4. Test rescheduling
    console.log(`\n4. Testing appointment rescheduling...`);
    const rescheduleRes = await fetch(`${API_BASE}/api/appointments/${testAppointment.id}/reschedule`, {
      method: 'PUT',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newSlotId: newSlot.id,
        reason: 'Testing rescheduling functionality'
      })
    });
    
    if (rescheduleRes.ok) {
      const result = await rescheduleRes.json();
      console.log('✅ Appointment rescheduled successfully!');
      console.log(`- Success: ${result.success}`);
      console.log(`- Message: ${result.message}`);
      
      // Check changes history again
      console.log(`\n5. Checking updated changes history...`);
      const updatedChangesRes = await fetch(`${API_BASE}/api/appointments/${testAppointment.id}/changes`, {
        headers: { 'Cookie': cookie }
      });
      
      if (updatedChangesRes.ok) {
        const updatedChanges = await updatedChangesRes.json();
        console.log(`Now found ${updatedChanges.length} change(s) in history`);
        
        const latestChange = updatedChanges[updatedChanges.length - 1];
        if (latestChange) {
          console.log(`\nLatest change:`);
          console.log(`- Action: ${latestChange.action}`);
          console.log(`- Reason: ${latestChange.reason}`);
          console.log(`- Before: ${JSON.stringify(latestChange.before)}`);
          console.log(`- After: ${JSON.stringify(latestChange.after)}`);
        }
      }
    } else {
      const error = await rescheduleRes.json();
      console.log(`❌ Rescheduling failed: ${error.message}`);
    }
    
    // 6. Test cancellation (optional - commented out to preserve appointment)
    /*
    console.log(`\n6. Testing appointment cancellation...`);
    const cancelRes = await fetch(`${API_BASE}/api/appointments/${testAppointment.id}/cancel`, {
      method: 'PUT',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Testing cancellation functionality'
      })
    });
    
    if (cancelRes.ok) {
      const result = await cancelRes.json();
      console.log('✅ Appointment cancelled successfully!');
      console.log(`- Refund eligible: ${result.refundEligible}`);
    } else {
      const error = await cancelRes.json();
      console.log(`❌ Cancellation failed: ${error.message}`);
    }
    */
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAppointmentManagement();