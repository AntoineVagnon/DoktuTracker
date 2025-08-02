// Simple script to create video appointments for testing
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { appointments } = require('./shared/schema');

async function createVideoAppointments() {
  try {
    console.log('Creating video appointments...');
    
    // Create database connection
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.hzmrkvooqjbxptqjqxii:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
    const actualUrl = databaseUrl.replace('[YOUR-PASSWORD]', process.env.DATABASE_PASSWORD || 'Vq4sA9j77ZNUf6CW');
    const client = postgres(actualUrl);
    const db = drizzle(client);
    
    // First update existing appointments to have video type
    const appointmentIds = [24, 16, 22]; // IDs from the logs
    
    for (const id of appointmentIds) {
      await db.update(appointments)
        .set({ 
          type: 'video',
          zoomMeetingId: `test-meeting-${id}`,
          zoomJoinUrl: `https://zoom.us/j/test${id}`,
          zoomStartUrl: `https://zoom.us/s/test${id}`
        })
        .where(eq(appointments.id, id));
        
      console.log(`✅ Updated appointment ${id} to video type`);
    }
    
    // Create times relative to now
    const now = new Date();
    
    // Update appointment 24 to be live (started 5 minutes ago)
    await db.update(appointments)
      .set({ appointmentDate: new Date(now.getTime() - 5 * 60 * 1000) })
      .where(eq(appointments.id, 24));
    console.log('✅ Set appointment 24 as live');
    
    // Update appointment 16 to start in 3 minutes
    await db.update(appointments)
      .set({ appointmentDate: new Date(now.getTime() + 3 * 60 * 1000) })
      .where(eq(appointments.id, 16));
    console.log('✅ Set appointment 16 to start soon');
    
    // Update appointment 22 to start in 15 minutes
    await db.update(appointments)
      .set({ appointmentDate: new Date(now.getTime() + 15 * 60 * 1000) })
      .where(eq(appointments.id, 22));
    console.log('✅ Set appointment 22 as scheduled');
    
    console.log('\n✅ Successfully created video appointments!');
    console.log('Please refresh your dashboard to see the video consultations.');
    
    await client.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Add missing import
const { eq } = require('drizzle-orm');

// Run the script
createVideoAppointments();