import { db } from "./server/db";
import { emailNotifications, users } from "./shared/schema";
import { eq } from "drizzle-orm";
import { emailService } from "./server/emailService";

async function fixAndSendEmail() {
  try {
    // Get user email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, 53));
    
    console.log(`📧 User email: ${user?.email}`);
    
    // Update the notification with the correct email
    const [notification] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.userId, 53));
    
    if (!notification) {
      console.log("❌ No notification found");
      return;
    }
    
    // Update with correct email
    await db
      .update(emailNotifications)
      .set({
        toEmail: user?.email || 'avagnonperso@gmail.com',
        status: "pending"
      })
      .where(eq(emailNotifications.id, notification.id));
    
    console.log("✅ Updated notification with email address");
    
    // Now send the email
    const [updatedNotification] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.id, notification.id));
    
    if (updatedNotification) {
      console.log(`\n📨 Sending email to: ${updatedNotification.toEmail}`);
      console.log(`Subject: ${updatedNotification.subject}`);
      
      const success = await emailService.sendEmail({
        to: updatedNotification.toEmail,
        subject: updatedNotification.subject,
        html: updatedNotification.body || '',
        attachments: updatedNotification.attachments ? JSON.parse(updatedNotification.attachments) : undefined
      });
      
      if (success) {
        await db
          .update(emailNotifications)
          .set({
            status: "sent",
            sentAt: new Date()
          })
          .where(eq(emailNotifications.id, notification.id));
        
        console.log("✅ Email sent successfully!");
      } else {
        console.log("❌ Failed to send email");
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

fixAndSendEmail();
