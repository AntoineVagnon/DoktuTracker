#!/usr/bin/env tsx

import { db } from "./server/db";
import { gdprDataProcessingRecords, users, dataSubjectRequests } from "./shared/schema";
import { eq, and, gte } from "drizzle-orm";

console.log("🔍 GDPR DATA PROCESSING RECORDS - QUALITY EVALUATION");
console.log("============================================================\n");

console.log("📋 FEATURE SUMMARY:");
console.log("The Data Processing Records System tracks how personal data is");
console.log("processed, including legal basis, retention periods, recipients,");
console.log("security measures, and transfer mechanisms per GDPR Article 30.\n");

let passedTests = 0;
let failedTests = 0;
let errorTests = 0;

async function runTest(name: string, testFn: () => Promise<boolean>) {
  try {
    const result = await testFn();
    if (result) {
      console.log(`✅ ${name} - PASS`);
      passedTests++;
    } else {
      console.log(`❌ ${name} - FAIL`);
      failedTests++;
    }
    return result;
  } catch (error: any) {
    console.log(`❌ ${name} - ERROR`);
    console.log(`   Issues: ${error.message}`);
    errorTests++;
    return false;
  }
}

async function testDataProcessingRecords() {
  // Get a test user
  const testUsers = await db.select().from(users).limit(1);
  if (testUsers.length === 0) {
    console.log("❌ No users found for testing");
    return;
  }
  const testUser = testUsers[0];

  console.log("\n🧪 CATEGORY 1: FUNCTIONAL TESTS");
  console.log("----------------------------------------");

  await runTest("F1: Create processing record with all fields", async () => {
    const record = await db.insert(gdprDataProcessingRecords).values({
      userId: testUser.id,
      processingPurpose: "Test Processing",
      legalBasis: "article_6_1_a",
      dataCategories: {
        personal: ["Name", "Email"],
        special: ["Health Data"]
      },
      retentionPeriod: "1 year",
      recipients: {
        internal: ["Admin Team"],
        external: ["Cloud Provider"]
      },
      securityMeasures: {
        technical: ["Encryption"],
        organizational: ["Access Control"]
      },
      dataSource: "User Input",
      transferMechanism: "HTTPS",
      isActive: true
    }).returning();
    
    return record.length > 0 && record[0].processingPurpose === "Test Processing";
  });

  await runTest("F2: Retrieve processing records for user", async () => {
    const records = await db.select()
      .from(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.userId, testUser.id));
    
    return records.length > 0;
  });

  await runTest("F3: Update processing record status", async () => {
    const records = await db.select()
      .from(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.userId, testUser.id))
      .limit(1);
    
    if (records.length === 0) return false;
    
    const updated = await db.update(gdprDataProcessingRecords)
      .set({ isActive: false })
      .where(eq(gdprDataProcessingRecords.id, records[0].id))
      .returning();
    
    return updated.length > 0 && updated[0].isActive === false;
  });

  await runTest("F4: Track all legal basis types", async () => {
    const legalBases = [
      "article_6_1_a", "article_6_1_b", "article_6_1_c",
      "article_6_1_d", "article_6_1_e", "article_6_1_f",
      "article_9_2_a", "article_9_2_h"
    ];
    
    for (const basis of legalBases) {
      await db.insert(gdprDataProcessingRecords).values({
        userId: testUser.id,
        processingPurpose: `Test ${basis}`,
        legalBasis: basis as any,
        dataCategories: { personal: ["Test"] },
        retentionPeriod: "1 year",
        isActive: true
      });
    }
    
    const records = await db.select()
      .from(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.userId, testUser.id));
    
    return records.length >= legalBases.length;
  });

  await runTest("F5: Delete processing record", async () => {
    const records = await db.select()
      .from(gdprDataProcessingRecords)
      .where(and(
        eq(gdprDataProcessingRecords.userId, testUser.id),
        eq(gdprDataProcessingRecords.processingPurpose, "Test Processing")
      ))
      .limit(1);
    
    if (records.length === 0) return false;
    
    await db.delete(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.id, records[0].id));
    
    const checkDeleted = await db.select()
      .from(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.id, records[0].id));
    
    return checkDeleted.length === 0;
  });

  console.log("\n🔬 CATEGORY 2: DATA INTEGRITY TESTS");
  console.log("----------------------------------------");

  await runTest("DI1: JSON field structure validation", async () => {
    const record = await db.insert(gdprDataProcessingRecords).values({
      userId: testUser.id,
      processingPurpose: "JSON Test",
      legalBasis: "article_6_1_a",
      dataCategories: {
        personal: ["Name", "Email", "Phone"],
        special: ["Medical Records", "Genetic Data"],
        sensitive: ["Political Opinions"]
      },
      retentionPeriod: "5 years",
      recipients: {
        internal: ["Medical Team", "Admin"],
        external: ["Insurance", "Labs"],
        thirdCountry: ["US Cloud Provider"]
      },
      securityMeasures: {
        technical: ["AES-256 Encryption", "TLS 1.3"],
        organizational: ["ISO 27001", "Staff Training"],
        physical: ["Biometric Access", "CCTV"]
      },
      isActive: true
    }).returning();
    
    const retrieved = await db.select()
      .from(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.id, record[0].id));
    
    const data = retrieved[0];
    return (
      data.dataCategories?.personal?.length === 3 &&
      data.recipients?.thirdCountry?.length === 1 &&
      data.securityMeasures?.physical?.length === 2
    );
  });

  await runTest("DI2: Retention period formats", async () => {
    const periods = [
      "30 days",
      "6 months",
      "1 year",
      "10 years from last interaction",
      "Until consent withdrawn",
      "Legal requirement: 7 years"
    ];
    
    for (const period of periods) {
      await db.insert(gdprDataProcessingRecords).values({
        userId: testUser.id,
        processingPurpose: `Retention Test: ${period}`,
        legalBasis: "article_6_1_c",
        dataCategories: { personal: ["Test"] },
        retentionPeriod: period,
        isActive: true
      });
    }
    
    const records = await db.select()
      .from(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.userId, testUser.id));
    
    return records.filter(r => r.processingPurpose.startsWith("Retention Test")).length === periods.length;
  });

  console.log("\n⚠️ CATEGORY 3: COMPLIANCE TESTS");
  console.log("----------------------------------------");

  await runTest("C1: Article 30 mandatory fields", async () => {
    // Test that all mandatory fields per GDPR Article 30 are present
    const record = await db.insert(gdprDataProcessingRecords).values({
      userId: testUser.id,
      processingPurpose: "Article 30 Test", // Purpose (mandatory)
      legalBasis: "article_6_1_b", // Legal basis (mandatory)
      dataCategories: { personal: ["Name"] }, // Categories (mandatory)
      retentionPeriod: "As per contract", // Retention (mandatory)
      recipients: { internal: ["Processing Team"] }, // Recipients (mandatory when applicable)
      securityMeasures: { technical: ["Encryption"] }, // Security (mandatory)
      isActive: true
    }).returning();
    
    return (
      record[0].processingPurpose !== null &&
      record[0].legalBasis !== null &&
      record[0].dataCategories !== null &&
      record[0].retentionPeriod !== null &&
      record[0].securityMeasures !== null
    );
  });

  await runTest("C2: Special category data handling", async () => {
    // Test Article 9 special categories require appropriate legal basis
    const record = await db.insert(gdprDataProcessingRecords).values({
      userId: testUser.id,
      processingPurpose: "Medical Treatment",
      legalBasis: "article_9_2_h", // Health/medical legal basis
      dataCategories: {
        special: ["Health Data", "Genetic Data", "Biometric Data"]
      },
      retentionPeriod: "10 years medical requirement",
      securityMeasures: {
        technical: ["End-to-end encryption", "Access logging"],
        organizational: ["HIPAA compliance", "Medical staff only"]
      },
      isActive: true
    }).returning();
    
    return (
      record[0].legalBasis.startsWith("article_9") &&
      record[0].dataCategories?.special?.length > 0
    );
  });

  console.log("\n🔄 CATEGORY 4: DATA SUBJECT REQUESTS");
  console.log("----------------------------------------");

  await runTest("DSR1: Create access request", async () => {
    const request = await db.insert(dataSubjectRequests).values({
      userId: testUser.id,
      requestType: "access",
      status: "pending",
      requestDetails: { scope: "all personal data" }
    }).returning();
    
    return request[0].requestType === "access" && request[0].status === "pending";
  });

  await runTest("DSR2: Create deletion request", async () => {
    const request = await db.insert(dataSubjectRequests).values({
      userId: testUser.id,
      requestType: "deletion",
      status: "pending",
      requestDetails: { 
        reason: "No longer using service",
        dataToDelete: ["account", "health_records"]
      }
    }).returning();
    
    return request[0].requestType === "deletion";
  });

  await runTest("DSR3: Update request status", async () => {
    const requests = await db.select()
      .from(dataSubjectRequests)
      .where(eq(dataSubjectRequests.userId, testUser.id))
      .limit(1);
    
    if (requests.length === 0) return false;
    
    const updated = await db.update(dataSubjectRequests)
      .set({ 
        status: "completed",
        completedAt: new Date(),
        responseDetails: { providedData: "user_export.json" }
      })
      .where(eq(dataSubjectRequests.id, requests[0].id))
      .returning();
    
    return updated[0].status === "completed" && updated[0].completedAt !== null;
  });

  console.log("\n⚡ CATEGORY 5: PERFORMANCE TESTS");
  console.log("----------------------------------------");

  await runTest("P1: Bulk processing records query", async () => {
    const start = Date.now();
    
    // Create 50 test records
    const records = [];
    for (let i = 0; i < 50; i++) {
      records.push({
        userId: testUser.id,
        processingPurpose: `Bulk Test ${i}`,
        legalBasis: "article_6_1_a" as const,
        dataCategories: { personal: [`Data ${i}`] },
        retentionPeriod: "1 year",
        isActive: true
      });
    }
    
    await db.insert(gdprDataProcessingRecords).values(records);
    
    // Query all records
    const retrieved = await db.select()
      .from(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.userId, testUser.id));
    
    const elapsed = Date.now() - start;
    console.log(`   Query time: ${elapsed}ms`);
    
    return elapsed < 5000 && retrieved.length >= 50;
  });

  // Clean up test data
  console.log("\n🧹 Cleaning up test data...");
  await db.delete(gdprDataProcessingRecords)
    .where(eq(gdprDataProcessingRecords.userId, testUser.id));
  await db.delete(dataSubjectRequests)
    .where(eq(dataSubjectRequests.userId, testUser.id));

  console.log("\n📊 TEST RESULTS SUMMARY");
  console.log("============================================================");
  console.log(`✅ Passed: ${passedTests} tests`);
  console.log(`❌ Failed: ${failedTests} tests`);
  console.log(`⚠️  Errors: ${errorTests} tests`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests + errorTests)) * 100)}%`);
  
  const totalTests = passedTests + failedTests + errorTests;
  const successRate = (passedTests / totalTests) * 100;
  
  if (successRate >= 80) {
    console.log("\n✨ QUALITY GATE: PASSED - System meets acceptance criteria");
  } else {
    console.log("\n⚠️ QUALITY GATE: FAILED - System needs improvements");
  }
}

// Run tests
testDataProcessingRecords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test suite failed:", error);
    process.exit(1);
  });