// Reusable email components for bulletproof email rendering
import { format, formatInTimeZone } from 'date-fns-tz';
import { format as formatDate } from 'date-fns';

export interface EmailHeaderData {
  preheaderText?: string;
}

export interface ButtonData {
  text: string;
  url: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface AppointmentData {
  appointmentId: string;
  patientName: string;
  doctorName: string;
  doctorSpecialization: string;
  appointmentDatetimeUtc: string;
  timezone: string;
  joinLink?: string;
  price?: string;
  currency?: string;
}

// Generate email header with Doktu logo and branding
export function generateEmailHeader(data: EmailHeaderData = {}): string {
  const preheader = data.preheaderText || 'Your healthcare appointment with Doktu';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <title>Doktu Medical Platform</title>
      <!--[if !mso]><!-->
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      </style>
      <!--<![endif]-->
      <!-- Preheader text (hidden but shows in email preview) -->
      <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
        ${preheader}
      </div>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc;">
      <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f8fafc;">
        <tr>
          <td style="padding: 20px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header with logo -->
              <tr>
                <td style="padding: 24px 32px; border-bottom: 1px solid #e2e8f0;">
                  <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                    <tr>
                      <td>
                        <img src="https://doktu.co/logo-email.png" 
                             alt="Doktu" 
                             width="120" 
                             height="28"
                             style="display: block; border: 0; outline: none; text-decoration: none; height: auto; font-family: Inter, Arial, sans-serif; font-size: 16px; font-weight: 600; color: #1e293b;">
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Main content area -->
              <tr>
                <td style="padding: 32px; font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #334155;">
  `;
}

// Generate bulletproof CTA button using table-based layout
export function generateButton(button: ButtonData): string {
  const styles = {
    primary: {
      backgroundColor: '#2563EB',
      color: '#ffffff',
      borderColor: '#2563EB'
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#475569',
      borderColor: '#cbd5e1'
    },
    danger: {
      backgroundColor: '#dc2626',
      color: '#ffffff',
      borderColor: '#dc2626'
    }
  };

  const style = styles[button.style || 'primary'];

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 8px 0;">
      <tr>
        <td style="background-color: ${style.backgroundColor}; border: 2px solid ${style.borderColor}; border-radius: 8px;">
          <a href="${button.url}"
             style="display: inline-block; font-family: Inter, Arial, sans-serif; font-size: 14px; font-weight: 500; line-height: 20px; color: ${style.color}; text-decoration: none; padding: 12px 18px; border-radius: 6px; min-width: 44px; min-height: 44px; box-sizing: border-box;"
             target="_blank">
            ${button.text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// Generate multiple buttons in a row
export function generateButtonGroup(buttons: ButtonData[]): string {
  const buttonCells = buttons.map(button => `
    <td style="padding-right: 16px; vertical-align: top;">
      ${generateButton(button)}
    </td>
  `).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 16px 0;">
      <tr>
        ${buttonCells}
      </tr>
    </table>
  `;
}

// Format appointment datetime with timezone awareness
export function formatAppointmentTime(utcDatetime: string, timezone: string): string {
  try {
    console.log(`📅 Formatting appointment time: ${utcDatetime} in timezone: ${timezone}`);
    
    // Ensure we have valid inputs
    if (!utcDatetime || !timezone) {
      console.error('Missing required parameters:', { utcDatetime, timezone });
      return utcDatetime || 'Invalid date';
    }
    
    // Parse the date with better error handling
    let date: Date;
    if (utcDatetime.includes('T') && utcDatetime.includes('Z')) {
      // Already ISO format with Z suffix
      date = new Date(utcDatetime);
    } else if (utcDatetime.includes('T')) {
      // ISO format but missing Z suffix - add it
      date = new Date(utcDatetime + 'Z');
    } else {
      // Try to parse as-is
      date = new Date(utcDatetime);
    }
    
    // Validate the parsed date
    if (isNaN(date.getTime())) {
      console.error('Invalid date after parsing:', { originalDate: utcDatetime, parsedDate: date });
      return `Invalid date: ${utcDatetime}`;
    }
    
    console.log(`📅 Parsed date successfully: ${date.toISOString()}`);
    
    // Format as: "Wednesday, Aug 20, 2025 · 13:00–13:30 (CEST)"
    const dayDate = formatInTimeZone(date, timezone, 'EEEE, MMM d, yyyy');
    const startTime = formatInTimeZone(date, timezone, 'HH:mm');
    
    // Calculate end time (assuming 30-minute appointments)
    const endDate = new Date(date.getTime() + 30 * 60 * 1000);
    const endTime = formatInTimeZone(endDate, timezone, 'HH:mm');
    
    // Get timezone abbreviation
    const timezoneAbbr = formatInTimeZone(date, timezone, 'zzz');
    
    const result = `${dayDate} · ${startTime}–${endTime} (${timezoneAbbr})`;
    console.log(`📅 Formatted result: ${result}`);
    return result;
  } catch (error) {
    console.error('Error formatting appointment time:', error);
    console.error('Input parameters:', { utcDatetime, timezone });
    return `Date formatting error: ${utcDatetime}`;
  }
}

// Generate appointment details card
export function generateAppointmentCard(data: AppointmentData): string {
  const formattedTime = formatAppointmentTime(data.appointmentDatetimeUtc, data.timezone);
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f1f5f9; border-radius: 8px; margin: 24px 0;">
      <tr>
        <td style="padding: 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
            <tr>
              <td style="font-family: Inter, Arial, sans-serif; font-size: 16px; font-weight: 600; color: #1e293b; padding-bottom: 16px;">
                📅 Appointment Details
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 8px;">
                <strong style="color: #475569;">Date & Time:</strong><br>
                <span style="font-size: 15px; color: #1e293b;">${formattedTime}</span>
                <br><small style="color: #64748b; font-size: 13px;">Shown in your local time zone</small>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 8px;">
                <strong style="color: #475569;">Doctor:</strong><br>
                <span style="font-size: 15px; color: #1e293b;">${data.doctorName} (${data.doctorSpecialization})</span>
              </td>
            </tr>
            ${data.price ? `
            <tr>
              <td style="padding-bottom: 8px;">
                <strong style="color: #475569;">Price:</strong><br>
                <span style="font-size: 15px; color: #1e293b;">${data.currency || '€'}${data.price}</span>
              </td>
            </tr>
            ` : ''}
            ${data.joinLink ? `
            <tr>
              <td style="padding-top: 16px;">
                ${generateButton({
                  text: '🔗 Join Video Call',
                  url: data.joinLink,
                  style: 'primary'
                })}
                <div style="margin-top: 8px;">
                  <a href="${process.env.VITE_APP_URL || 'https://app.doktu.co'}/test-camera" 
                     style="font-size: 13px; color: #0369a1; text-decoration: underline;"
                     target="_blank">
                    Test your camera and mic
                  </a>
                </div>
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
  `;
}

// Generate email footer
export function generateEmailFooter(): string {
  return `
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; border-top: 1px solid #e2e8f0; background-color: #f8fafc;">
                  <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                    <tr>
                      <td style="text-align: center;">
                        <p style="margin: 0; font-family: Inter, Arial, sans-serif; font-size: 13px; color: #64748b;">
                          © 2025 Doktu Medical Platform
                        </p>
                        <p style="margin: 8px 0 0 0; font-family: Inter, Arial, sans-serif; font-size: 13px;">
                          <a href="${process.env.VITE_APP_URL || 'https://app.doktu.co'}/support" style="color: #0369a1; text-decoration: underline;">Support</a> · 
                          <a href="${process.env.VITE_APP_URL || 'https://app.doktu.co'}/privacy" style="color: #0369a1; text-decoration: underline;">Privacy</a> · 
                          <a href="${process.env.VITE_APP_URL || 'https://app.doktu.co'}/terms" style="color: #0369a1; text-decoration: underline;">Terms</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Generate plain text version for accessibility
export function generatePlainTextContent(data: {
  subject: string;
  mainContent: string;
  buttons?: ButtonData[];
  appointmentData?: AppointmentData;
}): string {
  let plainText = `${data.subject}\n\n`;
  plainText += `${data.mainContent}\n\n`;
  
  if (data.appointmentData) {
    const formattedTime = formatAppointmentTime(
      data.appointmentData.appointmentDatetimeUtc, 
      data.appointmentData.timezone
    );
    plainText += `APPOINTMENT DETAILS:\n`;
    plainText += `Date & Time: ${formattedTime} (shown in your local time zone)\n`;
    plainText += `Doctor: ${data.appointmentData.doctorName} (${data.appointmentData.doctorSpecialization})\n`;
    if (data.appointmentData.price) {
      plainText += `Price: ${data.appointmentData.currency || '€'}${data.appointmentData.price}\n`;
    }
    if (data.appointmentData.joinLink) {
      plainText += `Join Video Call: ${data.appointmentData.joinLink}\n`;
      plainText += `Test camera/mic: ${process.env.VITE_APP_URL || 'https://app.doktu.co'}/test-camera\n`;
    }
    plainText += `\n`;
  }
  
  if (data.buttons && data.buttons.length > 0) {
    plainText += `ACTIONS:\n`;
    data.buttons.forEach(button => {
      plainText += `${button.text}: ${button.url}\n`;
    });
    plainText += `\n`;
  }
  
  plainText += `---\n`;
  plainText += `Doktu Medical Platform\n`;
  plainText += `Support: ${process.env.VITE_APP_URL || 'https://app.doktu.co'}/support\n`;
  plainText += `Privacy: ${process.env.VITE_APP_URL || 'https://app.doktu.co'}/privacy\n`;
  plainText += `Terms: ${process.env.VITE_APP_URL || 'https://app.doktu.co'}/terms\n`;
  
  return plainText;
}