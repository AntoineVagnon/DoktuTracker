import { db } from "./server/db";
import { appointments } from "./shared/schema";

async function createEndedAppointment() {
  try {
    console.log('Creating an ended video consultation appointment...');
    
    // Create appointment that ended 1 hour ago
    const now = new Date();
    const appointmentTime = new Date(now.getTime() - 90 * 60 * 1000); // 90 minutes ago
    
    const patientId = 49; // patient@test40.com
    const doctorId = 9; // James Rodriguez
    
    console.log(`Creating ended appointment for patient ${patientId} with doctor ${doctorId}`);
    console.log(`Appointment time: ${appointmentTime.toLocaleString()}`);
    
    // Create appointment with Zoom details
    const appointmentData = {
      patientId: patientId,
      doctorId: doctorId,
      appointmentDate: appointmentTime,
      status: 'paid' as const,
      paymentIntentId: 'pi_test_video_ended',
      zoomMeetingId: '111222333',
      zoomJoinUrl: 'https://zoom.us/j/111222333?pwd=ended',
      zoomStartUrl: 'https://zoom.us/s/111222333?zak=ended',
      zoomPassword: 'ended123',
      price: '35.00'
    };
    
    // Insert appointment
    const [result] = await db.insert(appointments).values(appointmentData).returning();
    
    console.log('\n✅ Successfully created ended video consultation appointment!');
    console.log('ID:', result.id);
    console.log('Time:', appointmentTime.toLocaleString());
    console.log('\nThis appointment should show "This consultation has ended" with a "Rate your experience" button.');
    
  } catch (error) {
    console.error('Error creating test appointment:', error);
  }
  
  process.exit(0);
}

createEndedAppointment();