#!/usr/bin/env tsx
/**
 * Deep investigation of SendGrid account status
 */

import sgMail from "@sendgrid/mail";
import axios from "axios";

async function checkSendGridAccount() {
  console.log("🔍 SendGrid Account Investigation");
  console.log("=====================================\n");

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;

  if (!apiKey) {
    console.error("❌ SENDGRID_API_KEY not set!");
    return;
  }

  console.log("🔑 API Key:", apiKey.substring(0, 15) + "...");
  console.log("📧 From Email:", fromEmail);
  console.log("\n");

  // Try to get account info directly from SendGrid API
  try {
    console.log("📊 Checking SendGrid Account Status...\n");
    
    // Check account limits
    const limitsResponse = await axios.get(
      'https://api.sendgrid.com/v3/user/credits',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("✅ Account Credits Response:");
    console.log(JSON.stringify(limitsResponse.data, null, 2));
    
  } catch (error: any) {
    if (error.response) {
      console.log("❌ Credits API Error:", error.response.status);
      console.log("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }

  // Try to get account profile
  try {
    console.log("\n📊 Checking Account Profile...\n");
    
    const profileResponse = await axios.get(
      'https://api.sendgrid.com/v3/user/profile',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("✅ Account Profile:");
    const profile = profileResponse.data;
    console.log(`  Username: ${profile.username}`);
    console.log(`  Email: ${profile.email}`);
    console.log(`  Account Type: ${profile.type}`);
    console.log(`  Active: ${profile.active}`);
    
  } catch (error: any) {
    if (error.response) {
      console.log("❌ Profile API Error:", error.response.status);
      console.log("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }

  // Check account type and plan
  try {
    console.log("\n📊 Checking Account Plan...\n");
    
    const accountResponse = await axios.get(
      'https://api.sendgrid.com/v3/user/account',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("✅ Account Details:");
    const account = accountResponse.data;
    console.log(`  Type: ${account.type}`);
    console.log(`  Reputation: ${account.reputation}`);
    
  } catch (error: any) {
    if (error.response) {
      console.log("❌ Account API Error:", error.response.status);
      if (error.response.data) {
        console.log("Response:", JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  // Check email activity stats
  try {
    console.log("\n📊 Checking Email Stats (Last 7 Days)...\n");
    
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = weekAgo.toISOString().split('T')[0];
    
    const statsResponse = await axios.get(
      `https://api.sendgrid.com/v3/stats?start_date=${startDate}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("✅ Email Statistics:");
    if (statsResponse.data && statsResponse.data.length > 0) {
      let totalRequests = 0;
      let totalDelivered = 0;
      let totalBounces = 0;
      
      statsResponse.data.forEach((day: any) => {
        if (day.stats && day.stats.length > 0) {
          day.stats.forEach((stat: any) => {
            totalRequests += stat.metrics.requests || 0;
            totalDelivered += stat.metrics.delivered || 0;
            totalBounces += stat.metrics.bounces || 0;
          });
        }
      });
      
      console.log(`  Total Requests: ${totalRequests}`);
      console.log(`  Total Delivered: ${totalDelivered}`);
      console.log(`  Total Bounces: ${totalBounces}`);
    } else {
      console.log("  No email activity in the last 7 days");
    }
    
  } catch (error: any) {
    if (error.response) {
      console.log("❌ Stats API Error:", error.response.status);
      if (error.response.data) {
        console.log("Response:", JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  // Test with a minimal email
  console.log("\n📨 Testing Minimal Email Send...\n");
  
  sgMail.setApiKey(apiKey);
  
  const testMsg = {
    to: "test@example.com", // Using a test address
    from: fromEmail || "test@test.com",
    subject: "Test",
    text: "Test"
  };

  try {
    // Use sandbox mode to avoid actually sending
    const response = await sgMail.send({
      ...testMsg,
      mailSettings: {
        sandboxMode: {
          enable: true
        }
      }
    } as any);
    
    console.log("✅ Sandbox test successful!");
    console.log("Response status:", response[0].statusCode);
    
  } catch (error: any) {
    console.error("❌ Sandbox test failed!");
    if (error.response && error.response.body) {
      console.log("Error details:", JSON.stringify(error.response.body, null, 2));
      
      // Check for specific error messages
      if (error.response.body.errors) {
        error.response.body.errors.forEach((err: any) => {
          if (err.message.includes("credits")) {
            console.log("\n⚠️  CREDITS ISSUE DETECTED!");
            console.log("The error specifically mentions credits.");
            console.log("\nPossible causes:");
            console.log("1. Free tier daily limit reached (100 emails/day)");
            console.log("2. Account suspended or restricted");
            console.log("3. Billing issue - payment failed or plan expired");
            console.log("4. API key is from a different account than expected");
          }
        });
      }
    }
  }

  console.log("\n🔧 Recommendations:");
  console.log("1. Log into SendGrid dashboard: https://app.sendgrid.com");
  console.log("2. Check Settings > Account Details > Your Products");
  console.log("3. Check Settings > Billing for any payment issues");
  console.log("4. Check Email API > Stats for usage details");
  console.log("5. Verify this API key belongs to the correct account");
}

// Run the check
checkSendGridAccount()
  .then(() => {
    console.log("\n✨ Investigation complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Investigation error:", error);
    process.exit(1);
  });