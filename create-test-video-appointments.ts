import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { appointments, users, doctors, doctorTimeSlots } from './shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

// Create database connection
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function createTestVideoAppointments() {
  try {
    // Find the patient (patient@test40.com)
    const [patient] = await db.select().from(users).where(eq(users.email, 'patient@test40.com'));

    if (!patient) {
      console.error('Patient not found');
      return;
    }

    // Find Dr. James Rodriguez
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, 9));

    if (!doctor) {
      console.error('Doctor not found');
      return;
    }

    // Get next 3 available slots from now
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const availableSlots = await db.select()
      .from(doctorTimeSlots)
      .where(and(
        eq(doctorTimeSlots.doctorId, doctor.id),
        eq(doctorTimeSlots.isAvailable, true),
        gte(doctorTimeSlots.date, todayStr)
      ))
      .orderBy(doctorTimeSlots.date, doctorTimeSlots.startTime)
      .limit(3);

    if (availableSlots.length < 3) {
      console.error('Not enough available slots found. Found:', availableSlots.length);
      return;
    }

    console.log('Found slots:', availableSlots.map(s => `${s.date} ${s.startTime}`));

    // Create appointments for each slot
    for (let i = 0; i < 3; i++) {
      const slot = availableSlots[i];
      
      // Combine date and time to create full timestamp
      const appointmentDateTime = new Date(`${slot.date}T${slot.startTime}`);
      
      // Create appointment
      const [newAppointment] = await db.insert(appointments).values({
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: appointmentDateTime,
        timeslotId: slot.id,
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

      // Mark the slot as unavailable
      await db.update(doctorTimeSlots)
        .set({ isAvailable: false })
        .where(eq(doctorTimeSlots.id, slot.id));

      console.log(`Created appointment ${i + 1}:`, {
        id: newAppointment.id,
        date: newAppointment.appointmentDate,
        type: newAppointment.type,
        zoomJoinUrl: newAppointment.zoomJoinUrl,
      });
    }

    console.log('✅ Successfully created 3 test video appointments');
  } catch (error) {
    console.error('Error creating test appointments:', error);
  } finally {
    await client.end();
  }
}

// Run the script
createTestVideoAppointments();