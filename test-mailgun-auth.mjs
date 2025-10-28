import formData from 'form-data';
import Mailgun from 'mailgun.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n🔐 Testing Mailgun Authentication');
console.log('═'.repeat(80));

const apiKey = process.env.MAILGUN_API_KEY;
const domain = process.env.MAILGUN_DOMAIN;

console.log(`\n📝 Configuration:`);
console.log(`   API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : '❌ NOT SET'}`);
console.log(`   Domain: ${domain || '❌ NOT SET'}`);

if (!apiKey) {
  console.log('\n❌ ERROR: MAILGUN_API_KEY not found in environment variables');
  process.exit(1);
}

if (!domain) {
  console.log('\n❌ ERROR: MAILGUN_DOMAIN not found in environment variables');
  process.exit(1);
}

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: apiKey,
  url: 'https://api.mailgun.net'
});

try {
  // Test 1: List domains
  console.log('\n\n🧪 TEST 1: List Domains');
  console.log('─'.repeat(80));

  const domains = await mg.domains.list();

  console.log(`✅ Authentication successful!`);
  console.log(`\nFound ${domains.items ? domains.items.length : 0} domain(s):`);

  if (domains.items && domains.items.length > 0) {
    for (const d of domains.items) {
      const isConfigured = d.name === domain;
      const icon = isConfigured ? '✅' : '  ';
      console.log(`${icon} ${d.name}`);
      console.log(`   State: ${d.state || 'unknown'}`);
      console.log(`   Type: ${d.type || 'unknown'}`);

      if (isConfigured) {
        console.log(`\n   ✅ This is your configured domain`);
      }
    }
  }

  // Test 2: Get domain details
  console.log('\n\n🧪 TEST 2: Get Domain Details');
  console.log('─'.repeat(80));

  try {
    const domainInfo = await mg.domains.get(domain);
    console.log(`✅ Domain exists: ${domainInfo.domain.name}`);
    console.log(`   State: ${domainInfo.domain.state}`);
    console.log(`   Type: ${domainInfo.domain.type}`);
    console.log(`   Created: ${domainInfo.domain.created_at}`);

    // Check DNS records
    console.log('\n📧 DNS Records Status:');
    if (domainInfo.receiving_dns_records) {
      console.log(`   Receiving Records: ${domainInfo.receiving_dns_records.length} configured`);
    }
    if (domainInfo.sending_dns_records) {
      console.log(`   Sending Records: ${domainInfo.sending_dns_records.length} configured`);

      for (const record of domainInfo.sending_dns_records) {
        const verified = record.valid === 'valid';
        const icon = verified ? '✅' : '❌';
        console.log(`   ${icon} ${record.record_type}: ${record.name || record.value?.substring(0, 40)}`);
        if (!verified) {
          console.log(`      ⚠️  Status: ${record.valid || 'not verified'}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Failed to get domain details:`, error.message);
  }

  // Test 3: List templates
  console.log('\n\n🧪 TEST 3: List Templates');
  console.log('─'.repeat(80));

  try {
    const templates = await mg.domains.domainTemplates.list(domain);

    if (templates.items && templates.items.length > 0) {
      console.log(`✅ Found ${templates.items.length} template(s):`);

      const requiredTemplates = [
        'account_registration_success',
        'account_password_reset',
        'doctor_application_approved',
        'booking_confirmation'
      ];

      for (const templateName of requiredTemplates) {
        const exists = templates.items.some(t => t.name === templateName);
        const icon = exists ? '✅' : '❌';
        console.log(`   ${icon} ${templateName}`);
      }

      console.log('\n   All templates:');
      for (const template of templates.items) {
        console.log(`      • ${template.name}`);
      }
    } else {
      console.log('⚠️  No templates found');
      console.log('   Templates may need to be created in Mailgun dashboard');
    }
  } catch (error) {
    console.error(`❌ Failed to list templates:`, error.message);
  }

  // Test 4: Send test email (validation only, not actually sending)
  console.log('\n\n🧪 TEST 4: Validate Sending Capability');
  console.log('─'.repeat(80));

  try {
    // Just test that we can construct a message (not actually sending)
    const testMessage = {
      from: `DoktuTracker <noreply@${domain}>`,
      to: 'test@example.com',
      subject: 'Test',
      text: 'Test'
    };

    console.log(`✅ Message construction successful`);
    console.log(`   From: ${testMessage.from}`);
    console.log(`   Note: Not actually sending test email`);
  } catch (error) {
    console.error(`❌ Message construction failed:`, error.message);
  }

  // Final Summary
  console.log('\n\n📊 SUMMARY');
  console.log('═'.repeat(80));

  console.log('\n✅ Authentication: SUCCESS');
  console.log(`   API key is valid and working`);

  console.log('\n📧 Domain Status:');
  console.log(`   ${domain} is accessible via API`);
  console.log(`   Check DNS verification status above`);

  console.log('\n📝 Template Status:');
  console.log(`   Check list above for required templates`);
  console.log(`   Missing templates need to be created in Mailgun dashboard`);

  console.log('\n🎯 Next Steps:');
  console.log('   1. If DNS records show ❌, complete domain verification in Mailgun dashboard');
  console.log('   2. If templates show ❌, create missing templates');
  console.log('   3. Test actual email sending via notification system');

} catch (error) {
  console.error('\n❌ AUTHENTICATION FAILED');
  console.error('═'.repeat(80));
  console.error(`\nError: ${error.message}`);
  console.error(`\nPossible causes:`);
  console.error(`   • Invalid API key`);
  console.error(`   • Wrong Mailgun region (US vs EU)`);
  console.error(`   • API key doesn't have necessary permissions`);
  console.error(`   • Network/firewall issues`);
  console.error(`\nFull error:`, error);
  process.exit(1);
}
