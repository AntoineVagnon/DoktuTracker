import { db } from "./server/db";
import { appointments } from "./shared/schema";

async function createTestAppointments() {
  try {
    console.log('Creating test video consultation appointments...');
    
    // Get current date and set times for appointments
    const today = new Date();
    const baseDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Create appointment times (in UTC - subtract 1 hour for CET)
    const appointment1Time = new Date(`${baseDate}T13:30:00.000Z`); // 2:30 PM CET
    const appointment2Time = new Date(`${baseDate}T14:00:00.000Z`); // 3:00 PM CET  
    const appointment3Time = new Date(`${baseDate}T14:30:00.000Z`); // 3:30 PM CET
    
    const patientId = 49; // patient@test40.com
    const doctorId = 9; // James Rodriguez
    
    console.log(`Creating appointments for patient ${patientId} with doctor ${doctorId}`);
    
    // Create appointments with Zoom details
    const appointmentData = [
      {
        patientId: patientId,
        doctorId: doctorId,
        appointmentDate: appointment1Time,
        status: 'paid' as const,
        paymentIntentId: 'pi_test_video_1',
        zoomMeetingId: '123456789',
        zoomJoinUrl: 'https://zoom.us/j/123456789?pwd=test1',
        zoomStartUrl: 'https://zoom.us/s/123456789?zak=test1',
        zoomPassword: 'test123',
        price: '35.00'
      },
      {
        patientId: patientId,
        doctorId: doctorId,
        appointmentDate: appointment2Time,
        status: 'paid' as const,
        paymentIntentId: 'pi_test_video_2',
        zoomMeetingId: '987654321',
        zoomJoinUrl: 'https://zoom.us/j/987654321?pwd=test2',
        zoomStartUrl: 'https://zoom.us/s/987654321?zak=test2',
        zoomPassword: 'test456',
        price: '35.00'
      },
      {
        patientId: patientId,
        doctorId: doctorId,
        appointmentDate: appointment3Time,
        status: 'paid' as const,
        paymentIntentId: 'pi_test_video_3',
        zoomMeetingId: '555666777',
        zoomJoinUrl: 'https://zoom.us/j/555666777?pwd=test3',
        zoomStartUrl: 'https://zoom.us/s/555666777?zak=test3',
        zoomPassword: 'test789',
        price: '35.00'
      }
    ];
    
    // Insert appointments
    const results = await db.insert(appointments).values(appointmentData).returning();
    
    console.log('\n✅ Successfully created 3 test video consultation appointments!');
    console.log('Times (CET):');
    console.log('- 2:30 PM - ID:', results[0].id);
    console.log('- 3:00 PM - ID:', results[1].id); 
    console.log('- 3:30 PM - ID:', results[2].id);
    console.log('\nYou can now test the video consultation feature in the dashboard.');
    
  } catch (error) {
    console.error('Error creating test appointments:', error);
  }
  
  process.exit(0);
}

createTestAppointments();