// Check appointments for patient@test40.com
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkAppointments() {
  try {
    // Get all appointments for patient ID 49
    const appointments = await sql`
      SELECT 
        a.id,
        a.appointment_date,
        a.status,
        a.type,
        a.notes,
        d.first_name,
        d.last_name,
        a.created_at
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_id = 49
      ORDER BY a.appointment_date DESC
      LIMIT 20
    `;
    
    console.log(`Found ${appointments.length} appointments for patient@test40.com:\n`);
    
    appointments.forEach(apt => {
      const date = new Date(apt.appointment_date);
      const localDate = date.toLocaleString('en-US', { 
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      console.log(`ID ${apt.id}: ${localDate} - Dr. ${apt.first_name} ${apt.last_name}`);
      console.log(`  Status: ${apt.status}, Type: ${apt.type}`);
      if (apt.notes) console.log(`  Notes: ${apt.notes}`);
      console.log(`  Created: ${new Date(apt.created_at).toLocaleString()}\n`);
    });
    
    // Check for recent appointments (next 24 hours)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const upcomingCount = appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= now && aptDate <= tomorrow && apt.status === 'paid';
    }).length;
    
    console.log(`Upcoming appointments in next 24 hours: ${upcomingCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAppointments();
