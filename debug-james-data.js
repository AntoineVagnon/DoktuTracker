import { db } from './server/db.ts';
import { doctors, users, doctorTimeSlots } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

console.log('🔍 Debugging James Rodriguez data...');

try {
  // Find James Rodriguez in users table
  const jamesUser = await db.select().from(users).where(eq(users.email, 'james.rodriguez@doktu.com'));
  console.log('👤 James User:', jamesUser);

  if (jamesUser.length > 0) {
    // Find James as a doctor
    const jamesDoctor = await db.select().from(doctors).where(eq(doctors.userId, jamesUser[0].id));
    console.log('👨‍⚕️ James Doctor:', jamesDoctor);

    if (jamesDoctor.length > 0) {
      const doctorId = jamesDoctor[0].id;
      console.log('🔢 Doctor ID:', doctorId);

      // Find all time slots for James
      const timeSlots = await db.select().from(doctorTimeSlots).where(eq(doctorTimeSlots.doctorId, doctorId));
      console.log('📅 Time slots for James:', timeSlots);

      // Count total slots
      console.log('📊 Total slots found:', timeSlots.length);
    }
  }

  // Also check all doctors to see IDs
  const allDoctors = await db.select({
    id: doctors.id,
    userId: doctors.userId,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName
  }).from(doctors).innerJoin(users, eq(doctors.userId, users.id));
  
  console.log('👥 All doctors with IDs:', allDoctors);

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);