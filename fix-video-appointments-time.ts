import { db } from "./server/db";
import { appointments } from "./shared/schema";
import { eq, and, gte } from "drizzle-orm";

async function fixAppointmentTimes() {
  try {
    console.log('Fixing test video consultation appointment times...');
    
    // First, delete the incorrectly timed appointments
    const deletedAppointments = await db.delete(appointments)
      .where(and(
        eq(appointments.patientId, 49),
        eq(appointments.doctorId, 9),
        gte(appointments.id, 17)
      ))
      .returning();
    
    console.log(`Deleted ${deletedAppointments.length} appointments`);
    
    // Get current date and set times for appointments
    const now = new Date();
    const baseDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Create appointment times (in UTC - subtract 2 hours for CET/CEST)
    const appointment1Time = new Date(`${baseDate}T12:30:00.000Z`); // 2:30 PM CEST
    const appointment2Time = new Date(`${baseDate}T13:00:00.000Z`); // 3:00 PM CEST  
    const appointment3Time = new Date(`${baseDate}T13:30:00.000Z`); // 3:30 PM CEST
    
    const patientId = 49; // patient@test40.com
    const doctorId = 9; // James Rodriguez
    
    console.log('Creating appointments with correct times...');
    console.log('Current time:', new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    
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
    
    console.log('\n✅ Successfully created 3 test video consultation appointments with correct times!');
    console.log('Times (CEST):');
    results.forEach((apt, index) => {
      const localTime = new Date(apt.appointmentDate).toLocaleString('en-US', { 
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      });
      console.log(`- ${localTime} - ID: ${apt.id}`);
    });
    console.log('\nThe appointments should now appear correctly in the dashboard.');
    
  } catch (error) {
    console.error('Error fixing appointment times:', error);
  }
  
  process.exit(0);
}

fixAppointmentTimes();