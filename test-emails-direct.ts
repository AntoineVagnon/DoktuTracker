#!/usr/bin/env tsx
/**
 * Direct email test script - sends all notification emails without complex database operations
 * Run with: tsx test-emails-direct.ts
 */

import { sendEmail } from "./server/services/emailService";

const TEST_EMAIL = "antoine.vagnon@gmail.com";

// Define all notification templates
const emailTemplates = [
  // Account & Security
  {
    category: "Account & Security",
    name: "Registration Success",
    subject: "Welcome to Doktu! Your Account is Ready",
    template: `
      <h2>Welcome to Doktu!</h2>
      <p>Dear Antoine,</p>
      <p>Your account has been successfully created. You can now book appointments with our medical professionals.</p>
      <p>Next steps:</p>
      <ul>
        <li>Complete your health profile</li>
        <li>Browse available doctors</li>
        <li>Book your first appointment</li>
      </ul>
      <a href="https://doktu.co/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Go to Dashboard</a>
    `
  },
  {
    category: "Account & Security", 
    name: "Password Reset",
    subject: "Reset Your Doktu Password",
    template: `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to create a new password.</p>
      <p>This link will expire in 1 hour for security reasons.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    `
  },

  // Appointments
  {
    category: "Appointments",
    name: "Booking Confirmation",
    subject: "Appointment Confirmed - Dr. Martin Dubois on Aug 30, 2025",
    template: `
      <h2>Your Appointment is Confirmed!</h2>
      <p>Dear Antoine,</p>
      <p><strong>Appointment Details:</strong></p>
      <ul>
        <li>Doctor: Dr. Martin Dubois</li>
        <li>Date: August 30, 2025</li>
        <li>Time: 10:00 AM (Europe/Paris)</li>
        <li>Type: Video Consultation</li>
        <li>Duration: 30 minutes</li>
      </ul>
      <p>Payment of €35 has been successfully processed.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">View Appointment</a>
    `
  },
  {
    category: "Appointments",
    name: "24-Hour Reminder",
    subject: "Reminder: Appointment Tomorrow with Dr. Martin Dubois",
    template: `
      <h2>Your Appointment is Tomorrow</h2>
      <p>This is a reminder that you have an appointment scheduled for tomorrow:</p>
      <ul>
        <li>Doctor: Dr. Martin Dubois</li>
        <li>Date: Tomorrow, August 30, 2025</li>
        <li>Time: 10:00 AM</li>
      </ul>
      <p><strong>Please prepare:</strong></p>
      <ul>
        <li>Test your camera and microphone</li>
        <li>Have your medical documents ready</li>
        <li>Prepare your questions for the doctor</li>
      </ul>
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Join Video Call</a>
    `
  },
  {
    category: "Appointments",
    name: "Cancellation Notice",
    subject: "Appointment Cancelled - Refund Processed",
    template: `
      <h2>Appointment Cancelled</h2>
      <p>Your appointment with Dr. Martin Dubois on August 30, 2025 has been cancelled.</p>
      <p>A full refund of €35 has been initiated and will appear in your account within 3-5 business days.</p>
      <p>Would you like to reschedule? Our doctors have availability this week.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Book New Appointment</a>
    `
  },

  // Billing & Payments
  {
    category: "Billing & Payments",
    name: "Payment Success",
    subject: "Payment Received - €35",
    template: `
      <h2>Payment Successful</h2>
      <p>We've received your payment of €35 for your appointment.</p>
      <p><strong>Transaction Details:</strong></p>
      <ul>
        <li>Amount: €35</li>
        <li>Date: ${new Date().toLocaleDateString()}</li>
        <li>Payment Method: Card ending in ****1234</li>
        <li>Transaction ID: TRX-2025-08-23-001</li>
      </ul>
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Download Receipt</a>
    `
  },
  {
    category: "Billing & Payments",
    name: "Refund Processed",
    subject: "Refund Processed - €35",
    template: `
      <h2>Refund Processed</h2>
      <p>Your refund has been successfully processed.</p>
      <p><strong>Refund Details:</strong></p>
      <ul>
        <li>Amount: €35</li>
        <li>Original Payment Date: August 20, 2025</li>
        <li>Refund Date: ${new Date().toLocaleDateString()}</li>
        <li>Expected Arrival: 3-5 business days</li>
      </ul>
      <p>The refund will be credited to your original payment method.</p>
    `
  },

  // Membership
  {
    category: "Membership",
    name: "Welcome to Membership",
    subject: "Welcome to Doktu Monthly Membership!",
    template: `
      <h2>Welcome to Doktu Membership!</h2>
      <p>Thank you for joining our Monthly Membership plan!</p>
      <p><strong>Your Benefits:</strong></p>
      <ul>
        <li>2 free consultations per month</li>
        <li>Priority booking access</li>
        <li>Extended appointment times (45 minutes)</li>
        <li>Access to specialist network</li>
        <li>Monthly health newsletter</li>
      </ul>
      <p>Your subscription of €45/month will renew automatically on the 23rd of each month.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Manage Membership</a>
    `
  },
  {
    category: "Membership",
    name: "Renewal Notice",
    subject: "Membership Renewal Coming Up",
    template: `
      <h2>Membership Renewal Notice</h2>
      <p>Your monthly membership will renew in 3 days.</p>
      <p><strong>Renewal Details:</strong></p>
      <ul>
        <li>Plan: Monthly Membership</li>
        <li>Amount: €45</li>
        <li>Renewal Date: August 26, 2025</li>
        <li>Payment Method: Card ending in ****1234</li>
      </ul>
      <p>No action needed - your membership will renew automatically.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Manage Subscription</a>
    `
  },

  // Health Documents
  {
    category: "Health Documents",
    name: "Document Available",
    subject: "New Medical Document Available",
    template: `
      <h2>New Document Available</h2>
      <p>Dr. Martin Dubois has shared a new medical document with you.</p>
      <p><strong>Document Details:</strong></p>
      <ul>
        <li>Type: Prescription</li>
        <li>Date: ${new Date().toLocaleDateString()}</li>
        <li>Valid Until: September 23, 2025</li>
      </ul>
      <p>You can download and print this document from your secure patient portal.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">View Document</a>
    `
  },

  // Marketing & Lifecycle
  {
    category: "Marketing",
    name: "New Feature Announcement",
    subject: "New: Book Specialist Appointments on Doktu",
    template: `
      <h2>Introducing Specialist Appointments</h2>
      <p>We're excited to announce that you can now book appointments with specialists!</p>
      <p><strong>Now Available:</strong></p>
      <ul>
        <li>Cardiologists</li>
        <li>Dermatologists</li>
        <li>Pediatricians</li>
        <li>Psychiatrists</li>
        <li>And more...</li>
      </ul>
      <p>Same convenient video consultations, expanded expertise.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Browse Specialists</a>
    `
  },
  {
    category: "Lifecycle",
    name: "Re-engagement Email",
    subject: "We Miss You at Doktu",
    template: `
      <h2>It's Been a While!</h2>
      <p>We noticed you haven't visited Doktu in a while. Your health is important to us!</p>
      <p><strong>Did you know?</strong></p>
      <ul>
        <li>We've added 20+ new doctors</li>
        <li>Evening appointments now available</li>
        <li>New membership plans with savings</li>
      </ul>
      <p>Book your next appointment and get 10% off with code: WELCOME_BACK</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Book Appointment</a>
    `
  }
];

async function sendTestEmails() {
  console.log("\n🚀 Starting direct email test");
  console.log(`📧 Sending ${emailTemplates.length} emails to: ${TEST_EMAIL}`);
  console.log("============================================================\n");

  let successCount = 0;
  let failCount = 0;

  for (const email of emailTemplates) {
    try {
      console.log(`\n📂 ${email.category}`);
      console.log(`📨 Sending: ${email.name}`);
      
      // Wrap template in proper HTML structure
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            h2 { color: #0066cc; }
            ul { margin: 10px 0; }
            li { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            ${email.template}
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
              This is a test email from the Doktu Universal Notification System.<br>
              Category: ${email.category} | Type: ${email.name}
            </p>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: TEST_EMAIL,
        subject: `[TEST] ${email.subject}`,
        html: fullHtml,
        text: email.template.replace(/<[^>]*>/g, '') // Strip HTML for text version
      });

      console.log(`✅ Successfully sent: ${email.name}`);
      successCount++;
      
      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to send ${email.name}:`, error);
      failCount++;
    }
  }

  console.log("\n============================================================");
  console.log(`📊 Test Results:`);
  console.log(`   ✅ Successful: ${successCount}/${emailTemplates.length}`);
  console.log(`   ❌ Failed: ${failCount}/${emailTemplates.length}`);
  console.log("\n🎉 Email test completed!");
  console.log(`📬 Check ${TEST_EMAIL} for the test emails`);
}

// Run the test
sendTestEmails()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  });