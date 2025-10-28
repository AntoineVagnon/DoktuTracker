import 'dotenv/config';
import sgMail from '@sendgrid/mail';

async function testSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  console.log('Testing SendGrid Configuration:');
  console.log('================================');
  console.log('API Key present:', !!apiKey);
  console.log('API Key format:', apiKey?.startsWith('SG.') ? 'Valid' : 'Invalid');
  console.log('API Key length:', apiKey?.length);
  console.log('From Email:', fromEmail);
  console.log('');

  if (!apiKey || !fromEmail) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  try {
    // Set API key
    sgMail.setApiKey(apiKey);
    console.log('✅ API Key set successfully');

    // Try to send a test email
    const msg = {
      to: 'qej8va2kd6@bwmyga.com',
      from: {
        email: fromEmail,
        name: 'Doktu Test'
      },
      subject: 'SendGrid Test Email',
      html: '<p>This is a test email to verify SendGrid configuration.</p>',
      text: 'This is a test email to verify SendGrid configuration.'
    };

    console.log('Attempting to send test email...');
    const response = await sgMail.send(msg);
    console.log('✅ Email sent successfully!');
    console.log('Response status:', response[0].statusCode);
    console.log('Response headers:', response[0].headers);
  } catch (error: any) {
    console.error('❌ Error sending email:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.statusCode);
      console.error('Response body:', JSON.stringify(error.response.body, null, 2));
    }
    process.exit(1);
  }
}

testSendGrid();
