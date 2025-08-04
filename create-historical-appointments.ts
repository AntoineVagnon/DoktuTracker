import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { appointments } from './shared/schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  connection: {
    search_path: 'doktu_public_schema,public'
  }
});
const db = drizzle(client);

async function createHistoricalAppointments() {
  try {
    // Create appointments in different time periods
    const now = new Date();
    
    // 15 days ago
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    // 45 days ago
    const fortyFiveDaysAgo = new Date(now);
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    
    // 120 days ago
    const oneHundredTwentyDaysAgo = new Date(now);
    oneHundredTwentyDaysAgo.setDate(oneHundredTwentyDaysAgo.getDate() - 120);
    
    console.log('Creating historical appointments...');
    
    // Insert appointments
    await db.insert(appointments).values([
      {
        doctorId: 9,
        patientId: 31,
        appointmentDate: fifteenDaysAgo,
        status: 'completed',
        price: '35.00',
        paymentIntentId: 'pi_historical_15days',
        videoCallStatus: 'completed'
      },
      {
        doctorId: 9,
        patientId: 32,
        appointmentDate: fortyFiveDaysAgo,
        status: 'completed',
        price: '35.00',
        paymentIntentId: 'pi_historical_45days',
        videoCallStatus: 'completed'
      },
      {
        doctorId: 9,
        patientId: 31,
        appointmentDate: oneHundredTwentyDaysAgo,
        status: 'completed',
        price: '35.00',
        paymentIntentId: 'pi_historical_120days',
        videoCallStatus: 'completed'
      }
    ]);
    
    console.log('Created 3 historical appointments:');
    console.log('- 1 appointment 15 days ago (visible in 30d and 90d)');
    console.log('- 1 appointment 45 days ago (visible in 90d only)');
    console.log('- 1 appointment 120 days ago (not visible in any period)');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Error creating appointments:', error);
    await client.end();
    process.exit(1);
  }
}

createHistoricalAppointments();