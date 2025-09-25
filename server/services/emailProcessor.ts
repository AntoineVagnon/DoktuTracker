import { UniversalNotificationService } from './notificationService';
import { getSendGridHealthCheck, isSendGridReady } from './emailService';

// Email processor to handle queued notifications
class EmailProcessor {
  private notificationService: UniversalNotificationService;
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor() {
    this.notificationService = new UniversalNotificationService();
    // Perform initial SendGrid health check
    this.performHealthCheck();
  }

  // Perform SendGrid health check with masked key logging
  private performHealthCheck() {
    const healthCheck = getSendGridHealthCheck();
    console.log('🔍 SendGrid Health Check:', JSON.stringify(healthCheck, null, 2));
    
    if (healthCheck.status === 'unhealthy') {
      console.error('❌ CRITICAL: SendGrid health check failed - email notifications may not work');
      console.error('📧 Health check details:', healthCheck.details);
    } else {
      console.log('✅ SendGrid health check passed - notification system ready');
    }
    
    return healthCheck;
  }

  // Start the email processor with periodic checking
  start(intervalMinutes = 1) {
    if (this.intervalId) {
      console.log('📧 Email processor already running');
      return;
    }

    console.log(`📧 Starting email processor (checking every ${intervalMinutes} minute(s))`);
    
    // Verify SendGrid is ready before starting
    if (!isSendGridReady()) {
      console.error('❌ CRITICAL: SendGrid not ready - cannot start email processor');
      const healthCheck = this.performHealthCheck();
      return;
    }
    
    // Process immediately
    this.processEmails();
    
    // Then process on interval
    this.intervalId = setInterval(() => {
      this.processEmails();
    }, intervalMinutes * 60 * 1000);
  }

  // Stop the email processor
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('📧 Email processor stopped');
    }
  }

  // Process pending email notifications
  private async processEmails() {
    if (this.isProcessing) {
      console.log('📧 Email processor already running, skipping this cycle');
      return;
    }

    this.isProcessing = true;
    
    try {
      console.log('📧 Processing pending email notifications...');
      await this.notificationService.processPendingNotifications();
    } catch (error) {
      console.error('📧 Error processing emails:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Manual trigger for immediate processing
  async processNow() {
    console.log('📧 Manual email processing triggered');
    await this.processEmails();
  }
}

// Create and export singleton instance
export const emailProcessor = new EmailProcessor();

// Start processor automatically when module is imported
// emailProcessor.start(1); // Check every minute - DISABLED to save resources

// Optional backup processing every 30 minutes for edge cases
// This is a safety net to catch any notifications that immediate processing might have missed
console.log('🛡️  Setting up backup email processor (every 30 minutes) for safety...');
emailProcessor.start(30); // Check every 30 minutes as backup

export default EmailProcessor;