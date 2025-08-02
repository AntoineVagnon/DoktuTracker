import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function createTestAppointments() {
  try {
    console.log('Creating test video consultation appointments...');
    
    // Get current date and set times for appointments
    const today = new Date();
    const baseDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Create appointment times (in UTC - subtract 1 hour for CET)
    const appointment1Time = new Date(`${baseDate}T13:30:00.000Z`); // 2:30 PM CET
    const appointment2Time = new Date(`${baseDate}T14:00:00.000Z`); // 3:00 PM CET
    const appointment3Time = new Date(`${baseDate}T14:30:00.000Z`); // 3:30 PM CET
    
    // Check if patient and doctor exist
    const patient = await sql`SELECT id FROM users WHERE email = 'patient@test40.com'`;
    const doctor = await sql`SELECT id FROM doctors WHERE id = 9`; // James Rodriguez
    
    if (!patient[0] || !doctor[0]) {
      console.error('Patient or doctor not found!');
      return;
    }
    
    const patientId = patient[0].id;
    const doctorId = 9;
    
    console.log(`Creating appointments for patient ${patientId} with doctor ${doctorId}`);
    
    // Create appointments with Zoom details
    const appointments = [
      {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: appointment1Time,
        status: 'paid',
        payment_intent_id: 'pi_test_video_1',
        zoom_meeting_id: '123456789',
        zoom_join_url: 'https://zoom.us/j/123456789?pwd=test1',
        zoom_start_url: 'https://zoom.us/s/123456789?zak=test1',
        zoom_password: 'test123',
        price: 35.00
      },
      {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: appointment2Time,
        status: 'paid',
        payment_intent_id: 'pi_test_video_2',
        zoom_meeting_id: '987654321',
        zoom_join_url: 'https://zoom.us/j/987654321?pwd=test2',
        zoom_start_url: 'https://zoom.us/s/987654321?zak=test2',
        zoom_password: 'test456',
        price: 35.00
      },
      {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: appointment3Time,
        status: 'paid',
        payment_intent_id: 'pi_test_video_3',
        zoom_meeting_id: '555666777',
        zoom_join_url: 'https://zoom.us/j/555666777?pwd=test3',
        zoom_start_url: 'https://zoom.us/s/555666777?zak=test3',
        zoom_password: 'test789',
        price: 35.00
      }
    ];
    
    // Insert appointments
    for (const appointment of appointments) {
      const result = await sql`
        INSERT INTO appointments (
          patient_id, doctor_id, appointment_date, status, 
          payment_intent_id, zoom_meeting_id, zoom_join_url, 
          zoom_start_url, zoom_password, price
        ) VALUES (
          ${appointment.patient_id}, ${appointment.doctor_id}, 
          ${appointment.appointment_date}, ${appointment.status},
          ${appointment.payment_intent_id}, ${appointment.zoom_meeting_id},
          ${appointment.zoom_join_url}, ${appointment.zoom_start_url},
          ${appointment.zoom_password}, ${appointment.price}
        ) RETURNING *
      `;
      
      console.log(`Created appointment at ${appointment.appointment_date.toLocaleString('en-US', { 
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      })} CET:`, result[0].id);
    }
    
    console.log('\n✅ Successfully created 3 test video consultation appointments!');
    console.log('Times (CET):');
    console.log('- 2:30 PM');
    console.log('- 3:00 PM'); 
    console.log('- 3:30 PM');
    console.log('\nYou can now test the video consultation feature in the dashboard.');
    
  } catch (error) {
    console.error('Error creating test appointments:', error);
  }
}

createTestAppointments();