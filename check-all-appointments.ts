import { db } from "./server/db";
import { appointments, users, doctors } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function checkAllAppointments() {
  console.log("🔍 Checking all appointments in database...\n");
  
  try {
    // Get all appointments with their related data
    const allAppointments = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        patientFirstName: users.firstName,
        patientLastName: users.lastName,
        doctorFirstName: sql<string>`doctor_user.first_name`,
        doctorLastName: sql<string>`doctor_user.last_name`,
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(sql`users as doctor_user`, sql`doctor_user.id = ${doctors.userId}`)
      .orderBy(appointments.appointmentDate);
    
    console.log(`Found ${allAppointments.length} total appointments:\n`);
    
    const now = new Date();
    let liveMeetings = 0;
    let plannedMeetings = 0;
    let completedMeetings = 0;
    let cancelledMeetings = 0;
    
    allAppointments.forEach(apt => {
      const appointmentTime = new Date(apt.appointmentDate);
      const minutesFromNow = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
      
      let category = '';
      if (apt.status === 'paid' && minutesFromNow >= -15 && minutesFromNow <= 0) {
        category = '🔴 LIVE';
        liveMeetings++;
      } else if (apt.status === 'paid' && minutesFromNow > 0) {
        category = '📅 PLANNED';
        plannedMeetings++;
      } else if (apt.status === 'completed') {
        category = '✅ COMPLETED';
        completedMeetings++;
      } else if (apt.status === 'cancelled') {
        category = '❌ CANCELLED';
        cancelledMeetings++;
      } else {
        category = '⚪ OTHER';
      }
      
      console.log(`${category} ID: ${apt.id}`);
      console.log(`  Patient: ${apt.patientFirstName} ${apt.patientLastName}`);
      console.log(`  Doctor: Dr. ${apt.doctorFirstName} ${apt.doctorLastName}`);
      console.log(`  Date: ${appointmentTime.toLocaleString()}`);
      console.log(`  Status: ${apt.status}`);
      console.log(`  Minutes from now: ${Math.round(minutesFromNow)}`);
      console.log('');
    });
    
    console.log("\n📊 Summary:");
    console.log(`  Live meetings: ${liveMeetings}`);
    console.log(`  Planned meetings: ${plannedMeetings}`);
    console.log(`  Completed meetings: ${completedMeetings}`);
    console.log(`  Cancelled meetings: ${cancelledMeetings}`);
    console.log(`  Total: ${allAppointments.length}`);
    
  } catch (error) {
    console.error("Error checking appointments:", error);
  } finally {
    process.exit(0);
  }
}

checkAllAppointments();