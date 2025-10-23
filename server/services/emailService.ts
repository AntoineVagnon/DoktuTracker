// Enhanced email service using Mailgun with bulletproof rendering and ICS attachments
import Mailgun from 'mailgun.js';
import formData from 'form-data';

// Mailgun Configuration Centralization
interface MailgunConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
  isInitialized: boolean;
}

class MailgunManager {
  private config: MailgunConfig;
  private client: any;

  constructor() {
    this.config = {
      apiKey: '',
      domain: '',
      fromEmail: '',
      isInitialized: false
    };
    this.initialize();
  }

  private initialize(): void {
    // Boot-time assertions for Mailgun configuration
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const fromEmail = process.env.MAILGUN_FROM_EMAIL;

    if (!apiKey) {
      console.warn('⚠️ WARNING: MAILGUN_API_KEY environment variable is not set');
      console.warn('⚠️ Email functionality will be disabled until Mailgun is configured');
      return; // Don't crash - just disable email functionality
    }

    if (!domain) {
      console.warn('⚠️ WARNING: MAILGUN_DOMAIN environment variable is not set');
      console.warn('⚠️ Email functionality will be disabled until Mailgun is configured');
      return; // Don't crash - just disable email functionality
    }

    if (!fromEmail) {
      console.warn('⚠️ WARNING: MAILGUN_FROM_EMAIL environment variable is not set');
      console.warn('⚠️ Email functionality will be disabled until Mailgun is configured');
      return; // Don't crash - just disable email functionality
    }

    // Validate API key format (Mailgun keys are 32 chars, hex format after the prefix)
    // Allow dev-dummy keys in development environment
    const isDevelopmentKey = apiKey.includes('dev-dummy') || apiKey.includes('dummy');
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isDevelopmentKey && apiKey.length < 30) {
      console.warn('⚠️ WARNING: Invalid Mailgun API key format - key too short');
      console.warn('⚠️ Email functionality will be disabled');
      return; // Don't crash - just disable email functionality
    }

    if (isDevelopmentKey && isProduction) {
      console.warn('⚠️ WARNING: Development Mailgun key cannot be used in production');
      console.warn('⚠️ Email functionality will be disabled');
      return; // Don't crash - just disable email functionality
    }

    if (isDevelopmentKey) {
      console.warn('⚠️ Using development Mailgun key - emails will not be sent');
    }

    // Set configuration
    this.config = {
      apiKey,
      domain,
      fromEmail,
      isInitialized: true
    };

    // Initialize Mailgun with proper error handling
    try {
      const mailgun = new Mailgun(formData);
      this.client = mailgun.client({
        username: 'api',
        key: apiKey,
        url: 'https://api.eu.mailgun.net' // EU region endpoint
      });
      console.log(`✅ Mailgun initialized successfully with API key: ${this.getMaskedKey()}`);
      console.log(`📧 Domain configured: ${domain}`);
      console.log(`📧 From email configured: ${fromEmail}`);
      console.log(`📧 Region: EU (api.eu.mailgun.net)`);
    } catch (error) {
      console.warn('⚠️ WARNING: Failed to initialize Mailgun:', error);
      console.warn('⚠️ Email functionality will be disabled');
      this.config.isInitialized = false; // Mark as not initialized
      return; // Don't crash - just disable email functionality
    }
  }

  // Health check with masked key logging
  public healthCheck(): { status: 'healthy' | 'unhealthy', details: any } {
    try {
      if (!this.config.isInitialized) {
        return {
          status: 'unhealthy',
          details: {
            error: 'Mailgun not initialized',
            apiKeyConfigured: !!process.env.MAILGUN_API_KEY,
            domainConfigured: !!process.env.MAILGUN_DOMAIN,
            fromEmailConfigured: !!process.env.MAILGUN_FROM_EMAIL
          }
        };
      }

      return {
        status: 'healthy',
        details: {
          initialized: true,
          apiKey: this.getMaskedKey(),
          domain: this.config.domain,
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

  public getConfig(): MailgunConfig {
    if (!this.config.isInitialized) {
      throw new Error('Mailgun not properly initialized');
    }
    return { ...this.config };
  }

  public getClient(): any {
    if (!this.config.isInitialized) {
      throw new Error('Mailgun not properly initialized');
    }
    return this.client;
  }

  public isReady(): boolean {
    return this.config.isInitialized;
  }
}

// Create singleton instance with boot-time validation
const mailgunManager = new MailgunManager();

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
  // Use centralized Mailgun manager for validation and configuration
  if (!mailgunManager.isReady()) {
    const healthCheck = mailgunManager.healthCheck();
    console.warn('❌ Mailgun not ready - email would be sent:', {
      to: options.to,
      subject: options.subject,
      hasAttachments: !!options.attachments?.length,
      hasPlainText: !!options.text,
      healthCheck
    });
    return;
  }

  try {
    const config = mailgunManager.getConfig();
    const client = mailgunManager.getClient();

    // Ensure email size is under Gmail's clipping limit (~102KB)
    const emailSize = Buffer.byteLength(options.html, 'utf8');
    if (emailSize > 100000) { // 100KB safety margin
      console.warn(`Email size (${emailSize} bytes) approaching Gmail clipping limit`);
    }

    // Prepare Mailgun message data
    const messageData: any = {
      from: `Doktu Medical Platform <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      // Enable click tracking and open tracking
      'o:tracking': 'yes',
      'o:tracking-clicks': 'yes',
      'o:tracking-opens': 'yes'
    };

    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      messageData.attachment = options.attachments.map(att => ({
        filename: att.filename,
        data: Buffer.from(att.content, 'base64'),
        contentType: att.contentType
      }));
    }

    // Send email using Mailgun
    const response = await client.messages.create(config.domain, messageData);
    console.log(`✅ Email sent successfully to ${options.to} (${emailSize} bytes)`);
    console.log(`📧 Mailgun Message ID: ${response.id}`);
  } catch (error: any) {
    console.error('❌ Error sending email:', error);

    // Log detailed Mailgun error information
    if (error.response) {
      console.error('📧 Mailgun Response Details:');
      console.error('   Status Code:', error.response.status || error.status);
      console.error('   Status Text:', error.response.statusText || error.statusText);
      console.error('   Data:', JSON.stringify(error.response.data || error.data, null, 2));
    }

    // Log the API key being used (masked)
    console.error('   Using API Key:', mailgunManager.healthCheck().details.apiKey);
    console.error('   Domain:', mailgunManager.healthCheck().details.domain);
    console.error('   From Email:', mailgunManager.healthCheck().details.fromEmail);

    throw error;
  }
}

// Export health check function for notification processor (backward compatibility)
export function getSendGridHealthCheck() {
  return mailgunManager.healthCheck();
}

// Export readiness check (backward compatibility)
export function isSendGridReady(): boolean {
  return mailgunManager.isReady();
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