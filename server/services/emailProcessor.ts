import { UniversalNotificationService } from './notificationService';

// Email processor to handle queued notifications
class EmailProcessor {
  private notificationService: UniversalNotificationService;
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor() {
    this.notificationService = new UniversalNotificationService();
  }

  // Start the email processor with periodic checking
  start(intervalMinutes = 1) {
    if (this.intervalId) {
      console.log('📧 Email processor already running');
      return;
    }

    console.log(`📧 Starting email processor (checking every ${intervalMinutes} minute(s))`);
    
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
emailProcessor.start(1); // Check every minute

export default EmailProcessor;