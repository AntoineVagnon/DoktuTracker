import { db } from './server/db';
import { appointments } from './shared/schema';
import { eq } from 'drizzle-orm';

async function fixVideoAppointmentsTimes() {
  try {
    console.log('🎥 Fixing video appointment times to match 30-minute intervals...');
    
    const now = new Date();
    
    // Round current time to nearest 30-minute interval
    const minutes = now.getMinutes();
    const roundedMinutes = Math.round(minutes / 30) * 30;
    now.setMinutes(roundedMinutes, 0, 0);
    
    // Update appointment 24 to be at current rounded time (live)
    const liveTime = new Date(now);
    await db.update(appointments).set({
      type: 'video',
      appointmentDate: liveTime,
      zoomMeetingId: 'test-meeting-24',
      zoomJoinUrl: 'https://zoom.us/j/test24',
      zoomStartUrl: 'https://zoom.us/s/test24',
      updatedAt: new Date()
    }).where(eq(appointments.id, 24));
    console.log(`✅ Updated appointment 24 to ${liveTime.toISOString()} (live now)`);
    
    // Update appointment 16 to next 30-minute slot
    const nextSlotTime = new Date(now.getTime() + 30 * 60 * 1000);
    await db.update(appointments).set({
      type: 'video',
      appointmentDate: nextSlotTime,
      zoomMeetingId: 'test-meeting-16',
      zoomJoinUrl: 'https://zoom.us/j/test16',
      zoomStartUrl: 'https://zoom.us/s/test16',
      updatedAt: new Date()
    }).where(eq(appointments.id, 16));
    console.log(`✅ Updated appointment 16 to ${nextSlotTime.toISOString()} (next slot)`);
    
    // Update appointment 22 to slot after that
    const laterSlotTime = new Date(now.getTime() + 60 * 60 * 1000);
    await db.update(appointments).set({
      type: 'video',
      appointmentDate: laterSlotTime,
      zoomMeetingId: 'test-meeting-22',
      zoomJoinUrl: 'https://zoom.us/j/test22',
      zoomStartUrl: 'https://zoom.us/s/test22',
      updatedAt: new Date()
    }).where(eq(appointments.id, 22));
    console.log(`✅ Updated appointment 22 to ${laterSlotTime.toISOString()} (in 1 hour)`);
    
    console.log('\n✅ Successfully fixed video appointment times!');
    console.log('All appointments now align with 30-minute intervals.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixVideoAppointmentsTimes();