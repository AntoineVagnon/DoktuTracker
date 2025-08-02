import { db } from './server/db';
import { appointments } from './shared/schema';
import { eq } from 'drizzle-orm';

async function updateAppointmentsToVideo() {
  try {
    console.log('🎥 Updating appointments to video type...');
    
    const now = new Date();
    
    // Update appointment 24 to be live (started 5 minutes ago)
    await db.update(appointments).set({
      type: 'video',
      appointmentDate: new Date(now.getTime() - 5 * 60 * 1000),
      zoomMeetingId: 'test-meeting-24',
      zoomJoinUrl: 'https://zoom.us/j/test24',
      zoomStartUrl: 'https://zoom.us/s/test24',
      updatedAt: new Date()
    }).where(eq(appointments.id, 24));
    console.log('✅ Updated appointment 24 as live video');
    
    // Update appointment 16 to start in 3 minutes
    await db.update(appointments).set({
      type: 'video',
      appointmentDate: new Date(now.getTime() + 3 * 60 * 1000),
      zoomMeetingId: 'test-meeting-16',
      zoomJoinUrl: 'https://zoom.us/j/test16',
      zoomStartUrl: 'https://zoom.us/s/test16',
      updatedAt: new Date()
    }).where(eq(appointments.id, 16));
    console.log('✅ Updated appointment 16 to start soon');
    
    // Update appointment 22 to start in 15 minutes
    await db.update(appointments).set({
      type: 'video',
      appointmentDate: new Date(now.getTime() + 15 * 60 * 1000),
      zoomMeetingId: 'test-meeting-22',
      zoomJoinUrl: 'https://zoom.us/j/test22',
      zoomStartUrl: 'https://zoom.us/s/test22',
      updatedAt: new Date()
    }).where(eq(appointments.id, 22));
    console.log('✅ Updated appointment 22 as scheduled');
    
    console.log('\n✅ Successfully created 3 video appointments!');
    console.log('Please refresh your dashboard to see:');
    console.log('- 1 live meeting (can join now)');
    console.log('- 1 starting soon (can join in a moment)');
    console.log('- 1 scheduled meeting (waiting)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateAppointmentsToVideo();