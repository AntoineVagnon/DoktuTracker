// Enhanced email service using SendGrid with bulletproof rendering and ICS attachments
import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  asm?: {
    groupId: number;
    groupsToDisplay?: number[];
  };
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured - email would be sent:', {
      to: options.to,
      subject: options.subject,
      hasAttachments: !!options.attachments?.length,
      hasPlainText: !!options.text
    });
    return;
  }

  try {
    // Ensure email size is under Gmail's clipping limit (~102KB)
    const emailSize = Buffer.byteLength(options.html, 'utf8');
    if (emailSize > 100000) { // 100KB safety margin
      console.warn(`Email size (${emailSize} bytes) approaching Gmail clipping limit`);
    }

    const msg: sgMail.MailDataRequired = {
      to: options.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@doktu.com',
        name: 'Doktu Medical Platform'
      },
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      // Enable click tracking and open tracking
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      },
      // Add unsubscribe group if provided
      asm: options.asm
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent successfully to ${options.to} (${emailSize} bytes)`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

// Enhanced function for sending appointment emails with ICS attachments
export async function sendAppointmentEmail(options: EmailOptions & {
  icsContent?: string;
  icsFilename?: string;
}): Promise<void> {
  const emailOptions: EmailOptions = {
    ...options,
    attachments: options.attachments || []
  };

  // Add ICS calendar attachment if provided
  if (options.icsContent) {
    emailOptions.attachments!.push({
      filename: options.icsFilename || 'appointment.ics',
      content: Buffer.from(options.icsContent, 'utf8').toString('base64'),
      contentType: 'text/calendar; charset=utf-8; method=REQUEST'
    });
  }

  return sendEmail(emailOptions);
}