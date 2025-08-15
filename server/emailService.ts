import { MailService } from '@sendgrid/mail';
import { format, parseISO } from 'date-fns';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

// Helper function to convert UTC time to local display format
function convertSlotTimeToLocal(date: string, time: string): string {
  try {
    const dateTime = new Date(`${date}T${time}:00`);
    return dateTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } catch {
    return time;
  }
}

// Helper function to generate ICS calendar file content
function generateICSContent({
  title,
  description,
  startDate,
  endDate,
  location
}: {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
}): string {
  const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Doktu//Telemedicine Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:appointment-${Date.now()}@doktu.com`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    `DTSTAMP:${formatDate(new Date())}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '').join('\r\n');
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

// Email templates configuration
const FROM_EMAIL = 'doktu@doktu.co';
const FROM_NAME = 'Doktu Medical Platform';

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
  }>;
}

export class EmailService {
  private async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      const emailData: any = {
        to: params.to,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: params.subject,
        html: params.html,
        text: params.text || this.stripHtml(params.html),
      };

      // Add attachments if provided
      if (params.attachments && params.attachments.length > 0) {
        emailData.attachments = params.attachments.map(attachment => ({
          content: Buffer.from(attachment.content).toString('base64'),
          filename: attachment.filename,
          type: attachment.type || 'text/calendar',
          disposition: 'attachment'
        }));
      }

      await mailService.send(emailData);
      console.log(`✅ Email sent successfully to ${params.to}: ${params.subject}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid email error:', error);
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private getEmailTemplate(content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Doktu - Telemedicine Platform</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .appointment-details { background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px 30px; text-align: center; color: #64748b; font-size: 14px; }
            .doctor-info { background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #10b981; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏥 Doktu</h1>
                <p>Your trusted telemedicine platform</p>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p>© 2025 Doktu Medical Platform. Secure • Professional • Convenient</p>
                <p>Questions? Contact us at support@doktu.com</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Appointment confirmation email for patients
  async sendAppointmentConfirmation({
    patientEmail,
    patientName,
    doctorName,
    specialty,
    appointmentDate,
    appointmentTime,
    consultationPrice,
    appointmentId
  }: {
    patientEmail: string;
    patientName: string;
    doctorName: string;
    specialty: string;
    appointmentDate: string;
    appointmentTime: string;
    consultationPrice: string;
    appointmentId: string;
  }): Promise<boolean> {
    const localTime = convertSlotTimeToLocal(appointmentDate, appointmentTime);
    const formattedDate = format(parseISO(appointmentDate), 'EEEE, MMMM d, yyyy');
    
    // Generate ICS calendar file
    const startDate = new Date(`${appointmentDate}T${appointmentTime}:00`);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes duration
    
    const icsContent = generateICSContent({
      title: `Telemedicine Consultation - Dr. ${doctorName}`,
      description: `Video consultation with Dr. ${doctorName}, ${specialty}. Appointment ID: #${appointmentId}. Join through your Doktu dashboard 15 minutes before the session.`,
      startDate,
      endDate,
      location: 'Video Consultation - Doktu Platform'
    });
    
    const content = `
      <h2>✅ Appointment Confirmed</h2>
      <p>Dear ${patientName},</p>
      <p>Your telemedicine consultation has been successfully booked and confirmed.</p>
      
      <div class="appointment-details">
        <h3>📅 Appointment Details</h3>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${localTime}</p>
        <p><strong>Duration:</strong> 30 minutes</p>
        <p><strong>Consultation Fee:</strong> €${consultationPrice}</p>
        <p><strong>Appointment ID:</strong> #${appointmentId}</p>
      </div>

      <div class="doctor-info">
        <h3>👨‍⚕️ Your Doctor</h3>
        <p><strong>Dr. ${doctorName}</strong></p>
        <p>Specialty: ${specialty}</p>
      </div>

      <p><strong>What's Next?</strong></p>
      <ul>
        <li>Save the attached calendar file (.ics) to add this appointment to your calendar</li>
        <li>You'll receive a reminder email 24 hours before your appointment</li>
        <li>A video consultation link will be provided 15 minutes before your session</li>
        <li>Please prepare any relevant medical documents or questions</li>
      </ul>

      <a href="${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/dashboard` : '#'}" class="button">View My Appointments</a>

      <p>If you need to reschedule or cancel, please do so at least 2 hours before your appointment time.</p>
    `;

    return this.sendEmail({
      to: patientEmail,
      subject: `Appointment Confirmed - Dr. ${doctorName} on ${formattedDate}`,
      html: this.getEmailTemplate(content),
      attachments: [{
        filename: `appointment-${appointmentId}.ics`,
        content: icsContent,
        type: 'text/calendar'
      }]
    });
  }

  // New appointment notification for doctors
  async sendDoctorNewAppointmentNotification({
    doctorEmail,
    doctorName,
    patientName,
    appointmentDate,
    appointmentTime,
    consultationPrice,
    appointmentId
  }: {
    doctorEmail: string;
    doctorName: string;
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
    consultationPrice: string;
    appointmentId: string;
  }): Promise<boolean> {
    const localTime = convertSlotTimeToLocal(appointmentDate, appointmentTime);
    const formattedDate = format(parseISO(appointmentDate), 'EEEE, MMMM d, yyyy');
    
    // Generate ICS calendar file for doctor
    const startDate = new Date(`${appointmentDate}T${appointmentTime}:00`);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes duration
    
    const icsContent = generateICSContent({
      title: `Patient Consultation - ${patientName}`,
      description: `Video consultation with patient ${patientName}. Appointment ID: #${appointmentId}. Join through your Doktu doctor dashboard.`,
      startDate,
      endDate,
      location: 'Video Consultation - Doktu Platform'
    });

    const content = `
      <h2>🔔 New Appointment Booked</h2>
      <p>Dear Dr. ${doctorName},</p>
      <p>You have a new telemedicine consultation appointment.</p>
      
      <div class="appointment-details">
        <h3>📅 Appointment Details</h3>
        <p><strong>Patient:</strong> ${patientName}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${localTime}</p>
        <p><strong>Duration:</strong> 30 minutes</p>
        <p><strong>Consultation Fee:</strong> €${consultationPrice}</p>
        <p><strong>Appointment ID:</strong> #${appointmentId}</p>
      </div>

      <p><strong>Preparation:</strong></p>
      <ul>
        <li>Save the attached calendar file (.ics) to add this appointment to your calendar</li>
        <li>Review the patient's health profile before the consultation</li>
        <li>The video consultation link will be available 15 minutes before the session</li>
        <li>All appointment details are available in your doctor dashboard</li>
      </ul>

      <a href="${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/dashboard` : '#'}" class="button">View Dashboard</a>
    `;

    return this.sendEmail({
      to: doctorEmail,
      subject: `New Appointment - ${patientName} on ${formattedDate}`,
      html: this.getEmailTemplate(content),
      attachments: [{
        filename: `appointment-${appointmentId}.ics`,
        content: icsContent,
        type: 'text/calendar'
      }]
    });
  }

  // Appointment reminder (24h before)
  async sendAppointmentReminder({
    patientEmail,
    patientName,
    doctorName,
    specialty,
    appointmentDate,
    appointmentTime,
    appointmentId
  }: {
    patientEmail: string;
    patientName: string;
    doctorName: string;
    specialty: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  }): Promise<boolean> {
    const localTime = convertSlotTimeToLocal(appointmentDate, appointmentTime);
    const formattedDate = format(parseISO(appointmentDate), 'EEEE, MMMM d, yyyy');

    const content = `
      <h2>⏰ Appointment Reminder</h2>
      <p>Dear ${patientName},</p>
      <p>This is a friendly reminder about your upcoming telemedicine consultation.</p>
      
      <div class="appointment-details">
        <h3>📅 Your Appointment Tomorrow</h3>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${localTime}</p>
        <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
        <p><strong>Specialty:</strong> ${specialty}</p>
        <p><strong>Appointment ID:</strong> #${appointmentId}</p>
      </div>

      <p><strong>Before Your Consultation:</strong></p>
      <ul>
        <li>Test your camera and microphone</li>
        <li>Ensure you have a stable internet connection</li>
        <li>Prepare any questions or medical documents</li>
        <li>Find a quiet, private space for the consultation</li>
      </ul>

      <a href="${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/dashboard` : '#'}" class="button">Join Video Call (Available 15 min before)</a>

      <p>Need to reschedule? Please do so at least 2 hours before your appointment.</p>
    `;

    return this.sendEmail({
      to: patientEmail,
      subject: `Reminder: Consultation with Dr. ${doctorName} Tomorrow`,
      html: this.getEmailTemplate(content)
    });
  }

  // Appointment cancellation notification
  async sendAppointmentCancellation({
    patientEmail,
    patientName,
    doctorName,
    appointmentDate,
    appointmentTime,
    refundAmount,
    appointmentId
  }: {
    patientEmail: string;
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    refundAmount?: string;
    appointmentId: string;
  }): Promise<boolean> {
    const localTime = convertSlotTimeToLocal(appointmentDate, appointmentTime);
    const formattedDate = format(parseISO(appointmentDate), 'EEEE, MMMM d, yyyy');

    const content = `
      <h2>❌ Appointment Cancelled</h2>
      <p>Dear ${patientName},</p>
      <p>Your appointment has been cancelled as requested.</p>
      
      <div class="appointment-details">
        <h3>📅 Cancelled Appointment</h3>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${localTime}</p>
        <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
        <p><strong>Appointment ID:</strong> #${appointmentId}</p>
        ${refundAmount ? `<p><strong>Refund Amount:</strong> €${refundAmount}</p>` : ''}
      </div>

      ${refundAmount ? 
        '<p><strong>Refund Information:</strong><br>Your refund will be processed within 3-5 business days to your original payment method.</p>' : 
        '<p><strong>Note:</strong> This appointment was cancelled outside the refund eligibility window.</p>'
      }

      <a href="https://doktu.com" class="button">Book New Appointment</a>

      <p>We're sorry to see you go. Feel free to book a new appointment anytime that works better for your schedule.</p>
    `;

    return this.sendEmail({
      to: patientEmail,
      subject: `Appointment Cancelled - Dr. ${doctorName}`,
      html: this.getEmailTemplate(content)
    });
  }

  // Password reset email
  async sendPasswordReset({
    email,
    firstName,
    resetLink
  }: {
    email: string;
    firstName: string;
    resetLink: string;
  }): Promise<boolean> {
    const content = `
      <h2>🔐 Password Reset Request</h2>
      <p>Dear ${firstName},</p>
      <p>We received a request to reset your password for your Doktu account.</p>
      
      <p>Click the button below to reset your password. This link will expire in 24 hours for security reasons.</p>

      <a href="${resetLink}" class="button">Reset My Password</a>

      <p><strong>If you didn't request this password reset:</strong></p>
      <ul>
        <li>You can safely ignore this email</li>
        <li>Your password will remain unchanged</li>
        <li>Consider changing your password if you're concerned about account security</li>
      </ul>

      <p><strong>For your security:</strong></p>
      <ul>
        <li>Never share your password with anyone</li>
        <li>Use a strong, unique password</li>
        <li>Log out from shared devices</li>
      </ul>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Doktu Password',
      html: this.getEmailTemplate(content)
    });
  }

  // Welcome email for new users
  async sendWelcomeEmail({
    email,
    firstName,
    userType
  }: {
    email: string;
    firstName: string;
    userType: 'patient' | 'doctor';
  }): Promise<boolean> {
    const content = userType === 'patient' ? `
      <h2>🎉 Welcome to Doktu!</h2>
      <p>Dear ${firstName},</p>
      <p>Welcome to Doktu, your trusted telemedicine platform. We're excited to help you access quality healthcare from the comfort of your home.</p>
      
      <p><strong>What you can do with Doktu:</strong></p>
      <ul>
        <li>📅 Book consultations with certified doctors</li>
        <li>💻 Join secure video consultations</li>
        <li>📋 Manage your health profile and medical history</li>
        <li>💊 Receive digital prescriptions</li>
        <li>🔔 Get appointment reminders and updates</li>
      </ul>

      <a href="https://doktu.com" class="button">Explore Our Doctors</a>

      <p>Your health is our priority. If you have any questions, our support team is here to help.</p>
    ` : `
      <h2>🎉 Welcome to the Doktu Medical Team!</h2>
      <p>Dear Dr. ${firstName},</p>
      <p>Welcome to Doktu! We're honored to have you join our network of healthcare professionals providing quality telemedicine services.</p>
      
      <p><strong>Your doctor tools include:</strong></p>
      <ul>
        <li>📊 Comprehensive doctor dashboard</li>
        <li>📅 Appointment and availability management</li>
        <li>👥 Patient records and consultation history</li>
        <li>💻 Secure video consultation platform</li>
        <li>📋 Digital prescription tools</li>
      </ul>

      <a href="https://doktu.com/doctor-dashboard" class="button">Access Your Dashboard</a>

      <p>Thank you for choosing to provide care through our platform. Together, we're making healthcare more accessible.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `Welcome to Doktu${userType === 'doctor' ? ' Medical Team' : ''}!`,
      html: this.getEmailTemplate(content)
    });
  }
}

export const emailService = new EmailService();