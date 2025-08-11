import { db } from "./db";
import { appointments } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { zoomService } from "./services/zoomService";

async function createZoomMeetingsForExistingAppointments() {
  console.log("🔄 Creating Zoom meetings for existing paid appointments...");
  
  try {
    // Find all paid appointments without Zoom meetings
    const paidAppointmentsWithoutZoom = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "paid"),
          isNull(appointments.zoomMeetingId)
        )
      );
    
    console.log(`Found ${paidAppointmentsWithoutZoom.length} paid appointments without Zoom meetings`);
    
    for (const appointment of paidAppointmentsWithoutZoom) {
      try {
        console.log(`Creating Zoom meeting for appointment ${appointment.id}...`);
        
        // Create Zoom meeting
        const meeting = await zoomService.createMeeting({
          topic: `Medical Consultation - Appointment #${appointment.id}`,
          startTime: appointment.appointmentDate.toISOString(),
          duration: 30,
          timezone: "Europe/Paris"
        });
        
        // Update appointment with Zoom details
        await db
          .update(appointments)
          .set({
            zoomMeetingId: meeting.id.toString(),
            zoomJoinUrl: meeting.join_url,
            zoomStartUrl: meeting.start_url,
            zoomPassword: meeting.password || null,
            updatedAt: new Date()
          })
          .where(eq(appointments.id, appointment.id));
        
        console.log(`✅ Created Zoom meeting ${meeting.id} for appointment ${appointment.id}`);
      } catch (error) {
        console.error(`❌ Failed to create Zoom meeting for appointment ${appointment.id}:`, error);
      }
    }
    
    console.log("✅ Finished creating Zoom meetings for existing appointments");
  } catch (error) {
    console.error("❌ Error creating Zoom meetings:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createZoomMeetingsForExistingAppointments();