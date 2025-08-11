import { emailService } from "./server/emailService";

async function checkSendGridError() {
  try {
    // Try to send a test email with detailed error logging
    const result = await emailService.sendEmail({
      to: 'avagnonperso@gmail.com',
      subject: 'Test Email',
      html: '<p>Test</p>'
    });
    
    console.log("Result:", result);
  } catch (error: any) {
    console.error("Full error:", error);
    if (error.response && error.response.body) {
      console.error("Error details:", JSON.stringify(error.response.body, null, 2));
    }
  }
  process.exit(0);
}

checkSendGridError();
