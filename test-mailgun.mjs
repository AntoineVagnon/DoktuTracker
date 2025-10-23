// Mailgun connectivity test
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

async function testMailgunConnection() {
  console.log('\n========================================');
  console.log('MAILGUN CONNECTION TEST');
  console.log('========================================\n');

  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL;

  if (!apiKey || !domain || !fromEmail) {
    console.error('❌ FAIL: Mailgun environment variables not set');
    return false;
  }

  const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
  console.log('✅ PASS: Environment variables configured');
  console.log('   Masked key:', maskedKey);
  console.log('   Domain:', domain);
  console.log('   From:', fromEmail);

  try {
    const mailgun = new Mailgun(formData);
    const client = mailgun.client({
      username: 'api',
      key: apiKey,
      url: 'https://api.eu.mailgun.net'
    });
    console.log('\n✅ PASS: Mailgun client initialized');

    const domainInfo = await client.domains.get(domain);
    console.log('✅ PASS: Domain validated');
    console.log('   State:', domainInfo.state);

    const testRecipient = process.env.TEST_EMAIL || fromEmail;
    const timestamp = new Date().toISOString();
    const response = await client.messages.create(domain, {
      from: 'Doktu Test <' + fromEmail + '>',
      to: testRecipient,
      subject: 'Mailgun Test - ' + timestamp,
      text: 'If you receive this, Mailgun is working correctly!',
      html: '<p>If you receive this, Mailgun is working correctly!</p><p>Test timestamp: ' + timestamp + '</p>'
    });

    console.log('\n✅ PASS: Test email sent');
    console.log('   Message ID:', response.id);
    console.log('   Recipient:', testRecipient);
    console.log('\n✅ ALL MAILGUN TESTS PASSED\n');
    return true;
  } catch (error) {
    console.error('\n❌ MAILGUN TEST FAILED:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
    }
    return false;
  }
}

testMailgunConnection().then(success => process.exit(success ? 0 : 1));
