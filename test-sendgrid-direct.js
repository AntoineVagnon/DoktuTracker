#!/usr/bin/env node

// Direct test of SendGrid via our email service
import { emailService } from './server/emailService.ts';

async function testSendGridDirect() {
  console.log('🔍 Testing SendGrid via our email service...\n');
  
  try {
    console.log('📧 Attempting to send test email...');
    
    await emailService.sendGenericEmail({
      to: 'antoine.vagnon@gmail.com',
      subject: 'SendGrid Test - Direct via EmailService',
      html: '<h1>SendGrid Test</h1><p>This is a test email to verify SendGrid configuration through our email service.</p>'
    });
    
    console.log('✅ Test Email Sent Successfully!');
    
  } catch (error) {
    console.log('❌ SendGrid Test Failed:', error.message);
    if (error.response && error.response.body) {
      console.log('📋 Error Details:', JSON.stringify(error.response.body, null, 2));
    }
    if (error.code) {
      console.log('📋 Error Code:', error.code);
    }
  }
}

testSendGridDirect().catch(console.error);