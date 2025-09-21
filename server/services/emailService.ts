// Enhanced email service using SendGrid with bulletproof rendering and ICS attachments
import sgMail from '@sendgrid/mail';

// SendGrid Configuration Centralization
interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  isInitialized: boolean;
}

class SendGridManager {
  private config: SendGridConfig;
  
  constructor() {
    this.config = {
      apiKey: '',
      fromEmail: '',
      isInitialized: false
    };
    this.initialize();
  }
  
  private initialize(): void {
    // Boot-time assertions for SendGrid configuration
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    
    if (!apiKey) {
      console.error('❌ CRITICAL: SENDGRID_API_KEY environment variable is not set');
      throw new Error('SendGrid API key is required for email functionality');
    }
    
    if (!fromEmail) {
      console.error('❌ CRITICAL: SENDGRID_FROM_EMAIL environment variable is not set');
      throw new Error('SendGrid from email is required for email functionality');
    }
    
    // Validate API key format (should be at least 50 chars and start with SG.)
    if (!apiKey.startsWith('SG.') || apiKey.length < 50) {
      console.error('❌ CRITICAL: Invalid SendGrid API key format');
      throw new Error('Invalid SendGrid API key format');
    }
    
    // Set configuration
    this.config = {
      apiKey,
      fromEmail,
      isInitialized: true
    };
    
    // Initialize SendGrid with proper error handling
    try {
      sgMail.setApiKey(apiKey);
      console.log(`✅ SendGrid initialized successfully with API key: ${this.getMaskedKey()}`);
      console.log(`📧 From email configured: ${fromEmail}`);
    } catch (error) {
      console.error('❌ CRITICAL: Failed to initialize SendGrid:', error);
      throw new Error('Failed to initialize SendGrid service');
    }
  }
  
  // Health check with masked key logging
  public healthCheck(): { status: 'healthy' | 'unhealthy', details: any } {
    try {
      if (!this.config.isInitialized) {
        return {
          status: 'unhealthy',
          details: {
            error: 'SendGrid not initialized',
            apiKeyConfigured: !!process.env.SENDGRID_API_KEY,
            fromEmailConfigured: !!process.env.SENDGRID_FROM_EMAIL
          }
        };
      }
      
      return {
        status: 'healthy',
        details: {
          initialized: true,
          apiKey: this.getMaskedKey(),
          fromEmail: this.config.fromEmail,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  private getMaskedKey(): string {
    if (!this.config.apiKey) return '[NOT_SET]';
    const key = this.config.apiKey;
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }
  
  public getConfig(): SendGridConfig {
    if (!this.config.isInitialized) {
      throw new Error('SendGrid not properly initialized');
    }
    return { ...this.config };
  }
  
  public isReady(): boolean {
    return this.config.isInitialized;
  }
}

// Create singleton instance with boot-time validation
const sendGridManager = new SendGridManager();

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
  // Use centralized SendGrid manager for validation and configuration
  if (!sendGridManager.isReady()) {
    const healthCheck = sendGridManager.healthCheck();
    console.warn('❌ SendGrid not ready - email would be sent:', {
      to: options.to,
      subject: options.subject,
      hasAttachments: !!options.attachments?.length,
      hasPlainText: !!options.text,
      healthCheck
    });
    return;
  }

  try {
    const config = sendGridManager.getConfig();
    
    // Ensure email size is under Gmail's clipping limit (~102KB)
    const emailSize = Buffer.byteLength(options.html, 'utf8');
    if (emailSize > 100000) { // 100KB safety margin
      console.warn(`Email size (${emailSize} bytes) approaching Gmail clipping limit`);
    }

    const msg: sgMail.MailDataRequired = {
      to: options.to,
      from: {
        email: config.fromEmail,
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

// Export health check function for notification processor
export function getSendGridHealthCheck() {
  return sendGridManager.healthCheck();
}

// Export readiness check
export function isSendGridReady(): boolean {
  return sendGridManager.isReady();
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