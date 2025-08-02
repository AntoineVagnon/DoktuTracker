import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { appointments as appointmentsTable, users, doctors, doctorTimeSlots } from './shared/schema';
import { eq, and, gte } from 'drizzle-orm';

// Create database connection using the same settings as the server
const databaseUrl = process.env.DATABASE_URL!;
const client = postgres(databaseUrl.replace('[YOUR-PASSWORD]', process.env.DATABASE_PASSWORD || ''));
const db = drizzle(client);

async function createTestVideoAppointments() {
  try {
    console.log('Creating test video appointments...');
    
    // Find the patient (patient@test40.com) - ID is 49 based on logs
    const patientId = 49;
    
    // Dr. James Rodriguez - ID is 9
    const doctorId = 9;
    
    // Get current time and create appointments for immediate testing
    const now = new Date();
    
    // Create 3 appointments:
    // 1. One that's already "live" (started 5 minutes ago)
    // 2. One that starts in 3 minutes (can join soon)
    // 3. One that starts in 15 minutes (waiting)
    
    const appointments = [
      {
        // Live appointment (started 5 minutes ago)
        appointmentDate: new Date(now.getTime() - 5 * 60 * 1000),
        description: 'Live appointment',
      },
      {
        // Starting in 3 minutes
        appointmentDate: new Date(now.getTime() + 3 * 60 * 1000),
        description: 'Starting soon',
      },
      {
        // Starting in 15 minutes
        appointmentDate: new Date(now.getTime() + 15 * 60 * 1000),
        description: 'Waiting appointment',
      },
    ];
    
    for (let i = 0; i < appointments.length; i++) {
      const appt = appointments[i];
      
      const [newAppointment] = await db.insert(appointmentsTable).values({
        patientId: patientId,
        doctorId: doctorId,
        appointmentDate: appt.appointmentDate,
        status: 'confirmed',
        type: 'video',
        paymentStatus: 'paid',
        paymentIntentId: `test_video_${Date.now()}_${i}`,
        paymentAmount: 5000, // €50.00
        currency: 'eur',
        // Add Zoom meeting details
        zoomMeetingId: `test-meeting-${Date.now()}-${i}`,
        zoomJoinUrl: `https://zoom.us/j/test${Date.now()}${i}`,
        zoomStartUrl: `https://zoom.us/s/test${Date.now()}${i}`,
      }).returning();

      console.log(`✅ Created ${appt.description}:`, {
        id: newAppointment.id,
        date: newAppointment.appointmentDate,
        type: newAppointment.type,
        zoomJoinUrl: newAppointment.zoomJoinUrl,
      });
    }

    console.log('✅ Successfully created 3 test video appointments!');
    console.log('Please refresh your dashboard to see the new video consultations.');
    
  } catch (error) {
    console.error('Error creating test appointments:', error);
  } finally {
    await client.end();
  }
}

// Run the script
createTestVideoAppointments();