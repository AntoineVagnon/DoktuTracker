import { db } from "./db";
import { appointments, users, doctors } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import axios from 'axios';

interface ZoomMeeting {
  id: number;
  uuid: string;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  start_url: string;
  join_url: string;
  password?: string;
}

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.ZOOM_CLIENT_ID || '';
  const clientSecret = process.env.ZOOM_CLIENT_SECRET || '';
  const accountId = process.env.ZOOM_ACCOUNT_ID || '';
  
  if (!clientId || !clientSecret || !accountId) {
    throw new Error('Zoom credentials not configured');
  }
  
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await axios.post<ZoomTokenResponse>(
    'https://zoom.us/oauth/token',
    `grant_type=account_credentials&account_id=${accountId}`,
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  
  return response.data.access_token;
}

async function createZoomMeeting(topic: string, startTime: Date, duration: number = 30): Promise<ZoomMeeting> {
  const accessToken = await getAccessToken();
  
  const response = await axios.post<ZoomMeeting>(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic,
      type: 2, // Scheduled meeting
      start_time: startTime.toISOString(),
      duration,
      timezone: 'Europe/Paris',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        jbh_time: 10, // Allow joining 10 minutes before
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        waiting_room: false,
        approval_type: 0, // Automatically approve
        audio: 'both',
        auto_recording: 'none'
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}

async function fixZoomMeetingsForExistingAppointments() {
  console.log("🔄 Creating Zoom meetings for existing paid appointments...");
  
  try {
    // Find all paid appointments without Zoom meetings
    const paidAppointmentsWithoutZoom = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "paid"),
          isNull(appointments.zoomMeetingId)
        )
      );
    
    console.log(`Found ${paidAppointmentsWithoutZoom.length} paid appointments without Zoom meetings`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const appointment of paidAppointmentsWithoutZoom) {
      try {
        console.log(`Creating Zoom meeting for appointment ${appointment.id}...`);
        
        // Get doctor info for the meeting topic
        const [doctor] = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName
          })
          .from(doctors)
          .innerJoin(users, eq(doctors.userId, users.id))
          .where(eq(doctors.id, appointment.doctorId));
        
        const doctorName = doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Doctor';
        
        // Create Zoom meeting
        const meeting = await createZoomMeeting(
          `Medical Consultation with ${doctorName} - Appointment #${appointment.id}`,
          appointment.appointmentDate,
          30
        );
        
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
        successCount++;
      } catch (error: any) {
        console.error(`❌ Failed to create Zoom meeting for appointment ${appointment.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`✅ Finished: ${successCount} meetings created, ${errorCount} errors`);
  } catch (error) {
    console.error("❌ Error creating Zoom meetings:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
fixZoomMeetingsForExistingAppointments();