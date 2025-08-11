import { db } from "./db";
import { appointments } from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import axios from 'axios';

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

async function updateZoomMeetingSettings(meetingId: string, accessToken: string): Promise<void> {
  try {
    // Update meeting settings to remove password requirement
    await axios.patch(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        settings: {
          waiting_room: false, // Disable waiting room for easier access
          join_before_host: true, // Allow joining before host
          jbh_time: 10, // Allow joining 10 minutes before
          meeting_authentication: false, // No authentication required
          password: null // Remove password
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Updated meeting ${meetingId} to remove password`);
  } catch (error: any) {
    console.error(`❌ Failed to update meeting ${meetingId}:`, error.response?.data || error.message);
  }
}

async function removePasswordsFromExistingMeetings() {
  console.log("🔄 Removing passwords from existing Zoom meetings...");
  
  try {
    // Find all appointments with Zoom meetings
    const appointmentsWithZoom = await db
      .select({
        id: appointments.id,
        zoomMeetingId: appointments.zoomMeetingId,
        zoomPassword: appointments.zoomPassword
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "paid"),
          isNotNull(appointments.zoomMeetingId)
        )
      );
    
    console.log(`Found ${appointmentsWithZoom.length} appointments with Zoom meetings`);
    
    const accessToken = await getAccessToken();
    let successCount = 0;
    let errorCount = 0;
    
    for (const appointment of appointmentsWithZoom) {
      if (appointment.zoomMeetingId) {
        try {
          console.log(`Updating meeting ${appointment.zoomMeetingId} for appointment ${appointment.id}...`);
          await updateZoomMeetingSettings(appointment.zoomMeetingId, accessToken);
          
          // Update the database to remove password
          await db
            .update(appointments)
            .set({
              zoomPassword: null,
              updatedAt: new Date()
            })
            .where(eq(appointments.id, appointment.id));
          
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }
    }
    
    console.log(`✅ Finished: ${successCount} meetings updated, ${errorCount} errors`);
  } catch (error) {
    console.error("❌ Error updating Zoom meetings:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
removePasswordsFromExistingMeetings();