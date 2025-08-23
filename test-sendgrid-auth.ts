#!/usr/bin/env tsx
/**
 * Test SendGrid authentication and configuration
 */

import sgMail from "@sendgrid/mail";

// Test the SendGrid configuration
async function testSendGrid() {
  console.log("🔍 Testing SendGrid Configuration");
  console.log("=====================================\n");

  // Check environment variables
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;

  console.log("📧 FROM_EMAIL:", fromEmail || "❌ NOT SET");
  console.log("🔑 SENDGRID_API_KEY:", apiKey ? `✅ Set (${apiKey.substring(0, 10)}...)` : "❌ NOT SET");

  if (!apiKey || !fromEmail) {
    console.error("\n❌ Missing required environment variables!");
    console.log("\nPlease ensure both SENDGRID_API_KEY and FROM_EMAIL are set.");
    return;
  }

  // Set the API key
  sgMail.setApiKey(apiKey);

  // Try to send a test email
  console.log("\n📨 Attempting to send test email...");
  
  const msg = {
    to: "antoine.vagnon@gmail.com",
    from: fromEmail,
    subject: "[SendGrid Test] Configuration Check",
    text: "This is a test email to verify SendGrid configuration.",
    html: "<p>This is a test email to verify SendGrid configuration.</p>"
  };

  try {
    const response = await sgMail.send(msg);
    console.log("✅ Email sent successfully!");
    console.log("Response status:", response[0].statusCode);
    console.log("Response headers:", response[0].headers);
  } catch (error: any) {
    console.error("\n❌ Failed to send email!");
    
    if (error.response) {
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      if (error.response.body && error.response.body.errors) {
        console.error("\nDetailed errors:");
        error.response.body.errors.forEach((err: any, index: number) => {
          console.error(`  ${index + 1}. ${err.message}`);
          if (err.field) console.error(`     Field: ${err.field}`);
          if (err.help) console.error(`     Help: ${err.help}`);
        });
      }
    } else {
      console.error("Error:", error);
    }

    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Verify your SendGrid API key is valid and has 'Mail Send' permission");
    console.log("2. Ensure the FROM_EMAIL address is verified in SendGrid");
    console.log("3. Check if your SendGrid account is active and not suspended");
    console.log("4. For new accounts, complete email sender verification");
  }
}

// Run the test
testSendGrid()
  .then(() => {
    console.log("\n✨ Test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unexpected error:", error);
    process.exit(1);
  });