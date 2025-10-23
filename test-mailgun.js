// Test Mailgun Integration
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
  url: 'https://api.eu.mailgun.net' // EU region endpoint
});

const testEmail = async () => {
  console.log('🧪 Testing Mailgun Integration...\n');

  // Display configuration (masked)
  console.log('📧 Configuration:');
  console.log(`   API Key: ${process.env.MAILGUN_API_KEY?.substring(0, 8)}...${process.env.MAILGUN_API_KEY?.slice(-4)}`);
  console.log(`   Domain: ${process.env.MAILGUN_DOMAIN}`);
  console.log(`   From Email: ${process.env.MAILGUN_FROM_EMAIL}\n`);

  try {
    const messageData = {
      from: `Doktu Medical Platform <${process.env.MAILGUN_FROM_EMAIL}>`,
      to: 'antoine.vagnon@gmail.com', // Authorized recipient
      subject: 'Mailgun Integration Test - Success!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">✅ Mailgun Integration Successful!</h1>
          <p>This test email confirms that your Mailgun integration is working correctly.</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Configuration Details:</h2>
            <ul>
              <li><strong>Domain:</strong> ${process.env.MAILGUN_DOMAIN}</li>
              <li><strong>From Email:</strong> ${process.env.MAILGUN_FROM_EMAIL}</li>
              <li><strong>Test Date:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            This email was sent automatically by the Doktu Tracker application to verify the Mailgun email service integration.
          </p>
        </div>
      `,
      text: `Mailgun Integration Test - Success!

This test email confirms that your Mailgun integration is working correctly.

Configuration Details:
- Domain: ${process.env.MAILGUN_DOMAIN}
- From Email: ${process.env.MAILGUN_FROM_EMAIL}
- Test Date: ${new Date().toLocaleString()}

This email was sent automatically by the Doktu Tracker application to verify the Mailgun email service integration.`,
      'o:tracking': 'yes',
      'o:tracking-clicks': 'yes',
      'o:tracking-opens': 'yes'
    };

    console.log('📤 Sending test email...');
    const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);

    console.log('\n✅ Email sent successfully!');
    console.log(`📧 Mailgun Message ID: ${response.id}`);
    console.log(`📧 Message: ${response.message}`);
    console.log('\n🎉 Mailgun integration is working perfectly!');
    console.log('\n💡 Note: Check your Mailgun sandbox email inbox for the test email.');
    console.log('   Sandbox emails only send to authorized recipients.');

  } catch (error) {
    console.error('\n❌ Error sending test email:', error.message);

    if (error.response) {
      console.error('\n📧 Mailgun Response Details:');
      console.error('   Status Code:', error.response.status || error.status);
      console.error('   Status Text:', error.response.statusText || error.statusText);
      console.error('   Data:', JSON.stringify(error.response.data || error.data, null, 2));
    }

    if (error.status) {
      console.error('\n📧 HTTP Status:', error.status);
    }

    if (error.details) {
      console.error('\n📧 Error Details:', JSON.stringify(error.details, null, 2));
    }

    console.error('\n💡 Troubleshooting Steps:');
    console.error('   1. Verify API key is correct and active in Mailgun dashboard');
    console.error('   2. For sandbox domains, add authorized recipient emails');
    console.error('   3. Check if your Mailgun account email is verified');
    console.error('   4. Ensure API key has "Send" permission');

    process.exit(1);
  }
};

testEmail();
