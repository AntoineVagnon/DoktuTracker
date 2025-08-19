#!/usr/bin/env tsx

import { db } from "./server/db";
import { gdprDataProcessingRecords, users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function seedProcessingRecords() {
  try {
    console.log("Seeding GDPR processing records...");
    
    // First, get an existing user or create one for demo
    const existingUsers = await db.select().from(users).limit(1);
    let userId: number;
    
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      console.log(`Using existing user ID: ${userId}`);
    } else {
      console.log("No users found, skipping seeding...");
      return;
    }
    
    // Create sample processing records for demonstration
    const records = [
      {
        userId, // Use the actual user ID
        processingPurpose: "Healthcare Service Provision",
        legalBasis: "article_9_2_h",
        dataCategories: {
          special: ["Health Data", "Medical History", "Prescriptions"],
          personal: ["Name", "Email", "Date of Birth", "Address"]
        },
        retentionPeriod: "10 years from last medical interaction",
        recipients: {
          internal: ["Medical Team", "Administrative Staff"],
          external: ["Laboratory Services", "Pharmacy Partners"]
        },
        securityMeasures: {
          technical: ["End-to-end encryption", "Access logging", "Regular backups"],
          organizational: ["Staff training", "Access control policies", "Regular audits"]
        },
        dataSource: "Direct collection from patient",
        transferMechanism: "Encrypted HTTPS transmission",
        isActive: true
      },
      {
        userId,
        processingPurpose: "Appointment Management",
        legalBasis: "article_6_1_b",
        dataCategories: {
          personal: ["Name", "Contact Details", "Appointment History"]
        },
        retentionPeriod: "3 years from last appointment",
        recipients: {
          internal: ["Scheduling Team", "Medical Staff"]
        },
        securityMeasures: {
          technical: ["Database encryption", "Secure API endpoints"],
          organizational: ["Limited access scope", "Regular training"]
        },
        dataSource: "Patient booking system",
        isActive: true
      },
      {
        userId,
        processingPurpose: "Payment Processing",
        legalBasis: "article_6_1_b",
        dataCategories: {
          personal: ["Name", "Billing Address", "Payment Method"]
        },
        retentionPeriod: "7 years for tax compliance",
        recipients: {
          external: ["Stripe Payment Processor", "Accounting Services"]
        },
        securityMeasures: {
          technical: ["PCI DSS compliance", "Tokenization", "SSL/TLS encryption"],
          organizational: ["Payment Card Industry standards", "Regular compliance audits"]
        },
        dataSource: "Payment gateway",
        transferMechanism: "Secure API with tokenization",
        isActive: true
      },
      {
        userId,
        processingPurpose: "Marketing Communications",
        legalBasis: "article_6_1_a",
        dataCategories: {
          personal: ["Email", "Communication Preferences"]
        },
        retentionPeriod: "Until consent withdrawn",
        recipients: {
          external: ["SendGrid Email Service"]
        },
        securityMeasures: {
          technical: ["Unsubscribe mechanisms", "Secure email transmission"],
          organizational: ["Consent management", "Preference center"]
        },
        dataSource: "User preferences",
        isActive: false
      }
    ];
    
    for (const record of records) {
      await db.insert(gdprDataProcessingRecords).values(record);
      console.log(`✅ Created processing record: ${record.processingPurpose}`);
    }
    
    console.log("✅ GDPR processing records seeded successfully");
    
  } catch (error) {
    console.error("Error seeding processing records:", error);
  } finally {
    process.exit(0);
  }
}

seedProcessingRecords();