import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { appointments } from './shared/schema';
import { addHours, format } from 'date-fns';
import { eq, sql as sqlOp } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const sql = neon(connectionString);
const db = drizzle(sql);

async function createTestAppointments() {
  try {
    console.log('Creating test appointments for inline actions...');
    
    // Using known IDs from the system
    const patientId = 49; // patient@test40.com
    const doctorId = 9;   // Dr. James Rodriguez

    // Create appointments 1, 2, and 3 hours from now
    const now = new Date();
    const appointmentsToInsert = [];
    
    for (let i = 1; i <= 3; i++) {
      const appointmentDate = addHours(now, i);
      
      const appointment = {
        patientId: patientId,
        doctorId: doctorId,
        appointmentDate: appointmentDate,
        status: 'paid' as const,
        type: i === 2 ? 'video' as const : 'in-person' as const, // Make the second one a video appointment
        price: 75,
        paymentIntentId: `test_payment_${Date.now()}_${i}`,
        sessionId: `test_session_${Date.now()}_${i}`,
        notes: `Test appointment ${i} for inline actions demo`,
        createdAt: now,
        updatedAt: now
      };
      
      appointmentsToInsert.push(appointment);
      console.log(`Creating appointment ${i}:`, {
        time: format(appointmentDate, 'yyyy-MM-dd HH:mm:ss'),
        type: appointment.type,
        status: appointment.status
      });
    }

    // Insert all appointments
    const inserted = await db.insert(appointments).values(appointmentsToInsert).returning();
    
    console.log(`\n✅ Successfully created ${inserted.length} test appointments!`);
    console.log('\nAppointment details:');
    inserted.forEach((apt, index) => {
      console.log(`${index + 1}. ID: ${apt.id}, Time: ${format(new Date(apt.appointmentDate), 'HH:mm')}, Type: ${apt.type}`);
    });

    // If the second appointment is video, add Zoom details
    const videoAppointment = inserted.find(apt => apt.type === 'video');
    if (videoAppointment) {
      await db.update(appointments)
        .set({
          zoomMeetingId: `test-meeting-${Date.now()}`,
          zoomJoinUrl: 'https://zoom.us/j/1234567890?pwd=testmeeting',
          zoomHostUrl: 'https://zoom.us/s/1234567890?zak=testhost',
          zoomPasscode: 'TEST123'
        })
        .where(eq(appointments.id, videoAppointment.id));
      
      console.log(`\n✅ Added Zoom details to video appointment (ID: ${videoAppointment.id})`);
    }
    
    console.log('\n🎉 Test appointments created successfully! You can now test:');
    console.log('- Reschedule button (available for all)');
    console.log('- Cancel button (if logged in as doctor)');
    console.log('- Join Video button (for the video appointment when it\'s time)');
    
  } catch (error) {
    console.error('Error creating test appointments:', error);
  }
}

createTestAppointments();