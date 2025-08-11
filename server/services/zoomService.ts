import axios from 'axios';
import { storage } from '../storage';

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

class ZoomService {
  private clientId: string;
  private clientSecret: string;
  private accountId: string;
  private baseUrl = 'https://api.zoom.us/v2';
  private tokenUrl = 'https://zoom.us/oauth/token';
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';

    if (!this.clientId || !this.clientSecret || !this.accountId) {
      console.warn('⚠️ Zoom credentials not configured. Video consultations will not be available.');
    }
  }

  /**
   * Get access token using Server-to-Server OAuth
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post<ZoomTokenResponse>(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.accountId
        }),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);
      
      console.log('✅ Zoom access token obtained successfully');
      return this.accessToken;
    } catch (error: any) {
      console.error('❌ Failed to get Zoom access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoom');
    }
  }

  /**
   * Create a Zoom meeting for an appointment
   */
  async createMeeting(appointmentId: number): Promise<ZoomMeeting | null> {
    if (!this.clientId || !this.clientSecret) {
      console.warn('Zoom not configured - skipping meeting creation');
      return null;
    }

    try {
      // Get appointment details
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Get doctor and patient details
      const doctor = await storage.getDoctor(appointment.doctorId);
      const patient = await storage.getUser(appointment.patientId);
      
      if (!doctor || !patient) {
        throw new Error('Doctor or patient not found');
      }

      // Get the doctor's user info for name details
      const doctorUser = await storage.getUser(doctor.userId);

      const accessToken = await this.getAccessToken();
      
      // Format the appointment date for Zoom (ISO 8601 format)
      const startTime = new Date(appointment.appointmentDate).toISOString();
      
      const meetingData = {
        topic: `Medical Consultation - Dr. ${doctorUser?.firstName || 'Doctor'} ${doctorUser?.lastName || ''}`,
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration: 30, // 30 minutes default
        timezone: 'Europe/Paris',
        // No password required - removed for easier access
        agenda: `Video consultation with ${patient.firstName || 'Patient'} ${patient.lastName || ''}`,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true, // Allow patients to join early
          jbh_time: 10, // Allow joining 10 minutes before
          mute_upon_entry: false,
          watermark: false,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          audio: 'both', // Both telephony and VoIP
          auto_recording: 'none', // No recording for privacy
          waiting_room: false, // Disabled for easier access
          meeting_authentication: false,
          email_notification: false, // We handle notifications ourselves
          authentication_exception: [], // No authentication exceptions
          registrants_confirmation_email: false
        }
      };

      const response = await axios.post<ZoomMeeting>(
        `${this.baseUrl}/users/me/meetings`,
        meetingData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const meeting = response.data;
      
      // Update appointment with Zoom details
      await storage.updateAppointment(appointmentId, {
        zoomMeetingId: meeting.id.toString(),
        zoomJoinUrl: meeting.join_url,
        zoomStartUrl: meeting.start_url,
        zoomPassword: meeting.password
      });

      console.log(`✅ Zoom meeting created for appointment ${appointmentId}`);
      return meeting;
    } catch (error: any) {
      console.error('❌ Failed to create Zoom meeting:', error.response?.data || error.message);
      // Don't throw - allow appointment to proceed without video
      return null;
    }
  }

  /**
   * Update a Zoom meeting
   */
  async updateMeeting(meetingId: string, appointmentId: number): Promise<boolean> {
    if (!this.clientId || !this.clientSecret) {
      return false;
    }

    try {
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const accessToken = await this.getAccessToken();
      const startTime = new Date(appointment.appointmentDate).toISOString();

      await axios.patch(
        `${this.baseUrl}/meetings/${meetingId}`,
        {
          start_time: startTime,
          duration: 30
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Zoom meeting ${meetingId} updated`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to update Zoom meeting:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(meetingId: string): Promise<boolean> {
    if (!this.clientId || !this.clientSecret || !meetingId) {
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();

      await axios.delete(
        `${this.baseUrl}/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      console.log(`✅ Zoom meeting ${meetingId} deleted`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to delete Zoom meeting:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: string): Promise<ZoomMeeting | null> {
    if (!this.clientId || !this.clientSecret || !meetingId) {
      return null;
    }

    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get<ZoomMeeting>(
        `${this.baseUrl}/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get Zoom meeting:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Generate a secure password for the meeting
   */
  private generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Check if Zoom is properly configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.accountId);
  }
}

// Export a singleton instance
export const zoomService = new ZoomService();