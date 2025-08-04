import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { appointments } from './shared/schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function checkDates() {
  const allAppointments = await db
    .select({
      id: appointments.id,
      date: appointments.appointmentDate,
      status: appointments.status
    })
    .from(appointments)
    .orderBy(appointments.appointmentDate);
  
  console.log('All appointments in database:');
  allAppointments.forEach(apt => {
    console.log(`ID: ${apt.id}, Date: ${apt.date}, Status: ${apt.status}`);
  });
  
  // Count by time period
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  const last7Days = allAppointments.filter(apt => 
    (apt.status === 'paid' || apt.status === 'completed') && new Date(apt.date) >= sevenDaysAgo
  ).length;
  
  const last30Days = allAppointments.filter(apt => 
    (apt.status === 'paid' || apt.status === 'completed') && new Date(apt.date) >= thirtyDaysAgo
  ).length;
  
  const last90Days = allAppointments.filter(apt => 
    (apt.status === 'paid' || apt.status === 'completed') && new Date(apt.date) >= ninetyDaysAgo
  ).length;
  
  console.log('\nAppointments by period (paid/completed only):');
  console.log(`Last 7 days: ${last7Days}`);
  console.log(`Last 30 days: ${last30Days}`);
  console.log(`Last 90 days: ${last90Days}`);
  
  await client.end();
  process.exit(0);
}

checkDates().catch(console.error);
