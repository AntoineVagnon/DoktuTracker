import { db } from "./server/db";
import { emailNotifications } from "./shared/schema";
import { eq, and, or, isNull, lte } from "drizzle-orm";
import { emailService } from "./server/emailService";

async function processEmailNotification() {
  try {
    // Get pending email notifications for user 53
    const pendingNotifications = await db
      .select()
      .from(emailNotifications)
      .where(
        and(
          eq(emailNotifications.userId, 53),
          eq(emailNotifications.status, "pending"),
          or(
            isNull(emailNotifications.scheduledFor),
            lte(emailNotifications.scheduledFor, new Date())
          )
        )
      );
    
    console.log(`📧 Found ${pendingNotifications.length} pending notifications`);
    
    for (const notification of pendingNotifications) {
      console.log(`\nProcessing notification ${notification.id}:`);
      console.log(`  Template: ${notification.templateKey}`);
      console.log(`  To: ${notification.toEmail}`);
      
      try {
        // Send the email using emailService
        const success = await emailService.sendEmail({
          to: notification.toEmail,
          subject: notification.subject,
          html: notification.body || '',
          attachments: notification.attachments ? JSON.parse(notification.attachments) : undefined
        });
        
        if (success) {
          // Update status to sent
          await db
            .update(emailNotifications)
            .set({
              status: "sent",
              sentAt: new Date()
            })
            .where(eq(emailNotifications.id, notification.id));
          
          console.log(`  ✅ Email sent successfully!`);
        } else {
          throw new Error("Email sending failed");
        }
      } catch (error) {
        console.error(`  ❌ Error sending email:`, error);
        
        // Update status to failed
        await db
          .update(emailNotifications)
          .set({
            status: "failed",
            error: error instanceof Error ? error.message : String(error)
          })
          .where(eq(emailNotifications.id, notification.id));
      }
    }
    
    if (pendingNotifications.length === 0) {
      console.log("No pending notifications to process");
    }
    
  } catch (error) {
    console.error("Error processing notifications:", error);
  }
  process.exit(0);
}

processEmailNotification();
