import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { doctorTimeSlots } from './server/schema.js';
import { eq } from 'drizzle-orm';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function checkDoctorSlots() {
  try {
    // Check slots for doctor 9 (James Rodriguez)
    const slots = await db.select()
      .from(doctorTimeSlots)
      .where(eq(doctorTimeSlots.doctorId, 9));
    
    console.log(`Found ${slots.length} slots for Dr. James Rodriguez (ID 9)`);
    
    if (slots.length > 0) {
      console.log('\nFirst 5 slots:');
      slots.slice(0, 5).forEach(slot => {
        console.log(`- ${slot.date} ${slot.startTime} - ${slot.endTime} (Available: ${slot.isAvailable})`);
      });
    }
    
    // Check if there are any future available slots
    const now = new Date();
    const futureAvailableSlots = slots.filter(slot => {
      const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
      return slotDateTime > now && slot.isAvailable;
    });
    
    console.log(`\nFuture available slots: ${futureAvailableSlots.length}`);
    
  } catch (error) {
    console.error('Error checking slots:', error);
  } finally {
    await sql.end();
  }
}

checkDoctorSlots();