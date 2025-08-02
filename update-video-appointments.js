// Update existing appointments to test video consultations
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL.replace('[YOUR-PASSWORD]', process.env.DATABASE_PASSWORD || 'Vq4sA9j77ZNUf6CW');
const sql = postgres(databaseUrl);

async function updateVideoAppointments() {
  try {
    console.log('Updating video appointments for testing...');
    
    const now = new Date();
    
    // Update appointment 24 to be "live" (started 5 minutes ago)
    await sql`
      UPDATE appointments 
      SET appointment_date = ${new Date(now.getTime() - 5 * 60 * 1000)}
      WHERE id = 24
    `;
    console.log('✅ Updated appointment 24 to be live');
    
    // Update appointment 16 to start in 3 minutes
    await sql`
      UPDATE appointments 
      SET appointment_date = ${new Date(now.getTime() + 3 * 60 * 1000)}
      WHERE id = 16
    `;
    console.log('✅ Updated appointment 16 to start in 3 minutes');
    
    // Update appointment 22 to start in 15 minutes
    await sql`
      UPDATE appointments 
      SET appointment_date = ${new Date(now.getTime() + 15 * 60 * 1000)}
      WHERE id = 22
    `;
    console.log('✅ Updated appointment 22 to start in 15 minutes');
    
    console.log('\n✅ Successfully updated 3 video appointments!');
    console.log('Please refresh your dashboard to see:');
    console.log('- 1 live meeting (can join now)');
    console.log('- 1 starting soon (can join in a moment)');
    console.log('- 1 scheduled meeting (waiting)');
    
    await sql.end();
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
  }
}

updateVideoAppointments();