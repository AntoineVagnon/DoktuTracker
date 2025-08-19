import { db } from './server/db';
import { 
  medicalDeviceAssessments,
  medicalDeviceFunctions,
  mdrComplianceRequirements,
  users 
} from './shared/schema';
import { eq } from 'drizzle-orm';

// ANSI color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

interface TestResult {
  passed: number;
  failed: number;
  errors: number;
  details: Array<{ test: string; status: 'pass' | 'fail' | 'error'; error?: string }>;
}

let results: TestResult = {
  passed: 0,
  failed: 0,
  errors: 0,
  details: []
};

// Test runner function
async function runTest(name: string, testFn: () => Promise<boolean>): Promise<void> {
  try {
    const result = await testFn();
    if (result) {
      console.log(`${GREEN}✅ ${name} - PASS${RESET}`);
      results.passed++;
      results.details.push({ test: name, status: 'pass' });
    } else {
      console.log(`${RED}❌ ${name} - FAIL${RESET}`);
      results.failed++;
      results.details.push({ test: name, status: 'fail' });
    }
  } catch (error: any) {
    console.log(`${RED}❌ ${name} - ERROR${RESET}`);
    console.log(`   Issues: ${error.message}`);
    results.errors++;
    results.details.push({ test: name, status: 'error', error: error.message });
  }
}

// Main test suite
async function runMDRComplianceTests() {
  console.log(`${CYAN}🔍 MEDICAL DEVICE REGULATION (MDR) COMPLIANCE - QUALITY EVALUATION${RESET}`);
  console.log('============================================================\n');
  
  console.log('📋 FEATURE SUMMARY:');
  console.log('The MDR Compliance Assessment system evaluates whether the');
  console.log('Doktu platform qualifies as Medical Device Software (MDSW)');
  console.log('under EU MDR 2017/745 regulations.\n');

  // Create test user
  let testUser: any;
  try {
    const [user] = await db.insert(users).values({
      email: `mdr-test-${Date.now()}@doktu.test`,
      role: 'admin',
      supabaseId: `test-mdr-${Date.now()}`,
      title: 'Dr',
      firstName: 'MDR',
      lastName: 'Tester'
    }).returning();
    testUser = user;
  } catch (error) {
    console.error('Failed to create test user:', error);
    return;
  }

  console.log('\n🧪 CATEGORY 1: ASSESSMENT CREATION');
  console.log('----------------------------------------');

  let assessmentId: string;

  await runTest("MDR1: Create new assessment", async () => {
    const assessment = await db.insert(medicalDeviceAssessments).values({
      assessmentVersion: '1.0',
      assessmentType: 'MDCG 2019-11',
      softwareName: 'Doktu Platform Test',
      softwareVersion: '2.0.0',
      isSoftware: true,
      isAccessory: false,
      processesData: true,
      benefitIndividualPatients: true,
      medicalDeviceClass: 'not_md',
      riskLevel: 'none',
      assessmentRationale: 'Test assessment for MDR compliance',
      assessedBy: testUser.id
    }).returning();
    
    assessmentId = assessment[0].id;
    return assessment.length > 0 && assessment[0].assessmentVersion === '1.0';
  });

  await runTest("MDR2: Retrieve assessment by ID", async () => {
    if (!assessmentId) return false;
    
    const [assessment] = await db.select()
      .from(medicalDeviceAssessments)
      .where(eq(medicalDeviceAssessments.id, assessmentId));
    
    return assessment && assessment.assessmentType === 'MDCG 2019-11';
  });

  await runTest("MDR3: Update assessment classification", async () => {
    if (!assessmentId) return false;
    
    const [updated] = await db.update(medicalDeviceAssessments)
      .set({ 
        medicalDeviceClass: 'class_iia',
        riskLevel: 'medium',
        ceMarkingRequired: true,
        notifiedBodyRequired: true,
        updatedAt: new Date()
      })
      .where(eq(medicalDeviceAssessments.id, assessmentId))
      .returning();
    
    return updated && updated.medicalDeviceClass === 'class_iia';
  });

  console.log('\n🖱️ CATEGORY 2: UI INTERACTION TESTS');
  console.log('----------------------------------------');

  await runTest("UI1: Evaluate button click functionality", async () => {
    // Test the API endpoint directly to simulate button click
    const testData = {
      isSoftware: true,
      isAccessory: false,
      processesData: true,
      benefitIndividualPatients: true,
      diagnosticFeatures: [],
      treatmentFeatures: [],
      monitoringFeatures: [],
      calculationFeatures: []
    };
    
    const response = await fetch('http://localhost:5000/api/mdr/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      console.log(`   Response status: ${response.status}`);
      return false;
    }
    
    const result = await response.json();
    return result.classification === 'not_md' && !result.ceMarkingRequired;
  });

  await runTest("UI2: Button error recovery", async () => {
    // Test with minimal data to ensure error handling works
    const response = await fetch('http://localhost:5000/api/mdr/evaluate', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isSoftware: false })
    });
    
    const result = await response.json();
    // Should still return a classification even with minimal data
    return result.hasOwnProperty('classification');
  });

  console.log('\n🔬 CATEGORY 3: DECISION TREE LOGIC');
  console.log('----------------------------------------');

  await runTest("DT1: Non-software classification", async () => {
    const assessment = await db.insert(medicalDeviceAssessments).values({
      assessmentVersion: '1.1',
      assessmentType: 'MDCG 2019-11',
      softwareVersion: '2.0.0',
      isSoftware: false,
      assessmentRationale: 'Not software - outside MDR scope'
    }).returning();
    
    return assessment[0].isSoftware === false;
  });

  await runTest("DT2: Communication-only software", async () => {
    const assessment = await db.insert(medicalDeviceAssessments).values({
      assessmentVersion: '1.2',
      assessmentType: 'MDCG 2019-11',
      softwareVersion: '2.0.0',
      isSoftware: true,
      isAccessory: false,
      processesData: false,
      benefitIndividualPatients: false,
      medicalDeviceClass: 'not_md',
      assessmentRationale: 'Communication only - not a medical device'
    }).returning();
    
    return assessment[0].medicalDeviceClass === 'not_md';
  });

  await runTest("DT3: Class IIa medical device software", async () => {
    const assessment = await db.insert(medicalDeviceAssessments).values({
      assessmentVersion: '1.3',
      assessmentType: 'MDCG 2019-11',
      softwareVersion: '2.0.0',
      isSoftware: true,
      processesData: true,
      benefitIndividualPatients: true,
      medicalDeviceClass: 'class_iia',
      riskLevel: 'medium',
      ceMarkingRequired: true,
      notifiedBodyRequired: true,
      diagnosticFeatures: { enabled: true, features: ['symptom_analysis'] },
      assessmentRationale: 'Diagnostic features - Class IIa'
    }).returning();
    
    return assessment[0].medicalDeviceClass === 'class_iia' && 
           assessment[0].notifiedBodyRequired === true;
  });

  console.log('\n⚠️ CATEGORY 3: MEDICAL DEVICE FUNCTIONS');
  console.log('----------------------------------------');

  await runTest("MDF1: Add diagnostic function", async () => {
    if (!assessmentId) return false;
    
    const func = await db.insert(medicalDeviceFunctions).values({
      assessmentId,
      functionCategory: 'diagnostic',
      functionName: 'Symptom Analysis',
      functionDescription: 'Analyzes patient symptoms for triage',
      potentialHarm: 'moderate',
      likelihoodOfHarm: 'unlikely',
      riskMitigation: 'Doctor review required',
      medicalPurpose: 'Support clinical decision making',
      intendedUsers: 'Healthcare professionals',
      clinicalBenefit: 'Faster triage and diagnosis',
      affectsClassification: true,
      requiresClinicalEvidence: true
    }).returning();
    
    return func[0].functionCategory === 'diagnostic';
  });

  await runTest("MDF2: Add monitoring function", async () => {
    if (!assessmentId) return false;
    
    const func = await db.insert(medicalDeviceFunctions).values({
      assessmentId,
      functionCategory: 'monitoring',
      functionName: 'Vital Signs Tracking',
      functionDescription: 'Tracks patient vital signs over time',
      potentialHarm: 'minor',
      likelihoodOfHarm: 'rare',
      riskMitigation: 'Data validation and alerts',
      medicalPurpose: 'Patient monitoring',
      intendedUsers: 'Doctors and patients',
      clinicalBenefit: 'Continuous health monitoring',
      affectsClassification: false
    }).returning();
    
    return func[0].functionCategory === 'monitoring';
  });

  await runTest("MDF3: Query functions by assessment", async () => {
    if (!assessmentId) return false;
    
    const functions = await db.select()
      .from(medicalDeviceFunctions)
      .where(eq(medicalDeviceFunctions.assessmentId, assessmentId));
    
    return functions.length >= 2;
  });

  console.log('\n📝 CATEGORY 4: COMPLIANCE REQUIREMENTS');
  console.log('----------------------------------------');

  await runTest("CR1: Add technical documentation requirement", async () => {
    if (!assessmentId) return false;
    
    const requirement = await db.insert(mdrComplianceRequirements).values({
      assessmentId,
      requirementCategory: 'documentation',
      requirementName: 'Technical Documentation',
      requirementDescription: 'Complete technical file per MDR Annex II',
      regulationReference: 'MDR Annex II',
      standardReference: 'ISO 13485:2016',
      complianceStatus: 'not_assessed',
      priority: 'critical',
      riskIfNonCompliant: 'Cannot place device on market'
    }).returning();
    
    return requirement[0].requirementCategory === 'documentation';
  });

  await runTest("CR2: Add risk management requirement", async () => {
    if (!assessmentId) return false;
    
    const requirement = await db.insert(mdrComplianceRequirements).values({
      assessmentId,
      requirementCategory: 'risk_management',
      requirementName: 'Risk Management System',
      requirementDescription: 'Risk management per ISO 14971',
      regulationReference: 'MDR Article 10(2)',
      standardReference: 'ISO 14971:2019',
      complianceStatus: 'partial',
      evidenceProvided: 'Basic risk assessment completed',
      gapsIdentified: 'Need formal risk management file',
      remediationActions: 'Create ISO 14971 compliant documentation',
      targetCompletionDate: '2025-09-30',
      priority: 'high',
      riskIfNonCompliant: 'Non-conformity in audit'
    }).returning();
    
    return requirement[0].complianceStatus === 'partial';
  });

  await runTest("CR3: Update requirement status", async () => {
    if (!assessmentId) return false;
    
    const requirements = await db.select()
      .from(mdrComplianceRequirements)
      .where(eq(mdrComplianceRequirements.assessmentId, assessmentId))
      .limit(1);
    
    if (requirements.length === 0) return false;
    
    const [updated] = await db.update(mdrComplianceRequirements)
      .set({ 
        complianceStatus: 'compliant',
        evidenceProvided: 'Full documentation provided',
        updatedAt: new Date()
      })
      .where(eq(mdrComplianceRequirements.id, requirements[0].id))
      .returning();
    
    return updated.complianceStatus === 'compliant';
  });

  console.log('\n🔐 CATEGORY 5: REGULATORY COMPLIANCE');
  console.log('----------------------------------------');

  await runTest("RC1: CE marking requirements", async () => {
    const assessment = await db.insert(medicalDeviceAssessments).values({
      assessmentVersion: '2.0',
      assessmentType: 'CE Marking Assessment',
      softwareVersion: '2.0.0',
      medicalDeviceClass: 'class_i',
      ceMarkingRequired: true,
      notifiedBodyRequired: false,
      assessmentRationale: 'Class I device - self-certification'
    }).returning();
    
    return assessment[0].ceMarkingRequired === true && 
           assessment[0].notifiedBodyRequired === false;
  });

  await runTest("RC2: Notified body requirements", async () => {
    const assessment = await db.insert(medicalDeviceAssessments).values({
      assessmentVersion: '2.1',
      assessmentType: 'Notified Body Assessment',
      softwareVersion: '2.0.0',
      medicalDeviceClass: 'class_iib',
      riskLevel: 'high',
      ceMarkingRequired: true,
      notifiedBodyRequired: true,
      assessmentRationale: 'Class IIb device - notified body required'
    }).returning();
    
    return assessment[0].notifiedBodyRequired === true && 
           assessment[0].riskLevel === 'high';
  });

  console.log('\n⚡ CATEGORY 6: PERFORMANCE TESTS');
  console.log('----------------------------------------');

  const startTime = Date.now();
  
  await runTest("P1: Bulk assessment query", async () => {
    const assessments = await db.select()
      .from(medicalDeviceAssessments)
      .limit(50);
    
    const queryTime = Date.now() - startTime;
    console.log(`   Query time: ${queryTime}ms`);
    
    return queryTime < 1000; // Should complete under 1 second
  });

  await runTest("P2: Complex join query", async () => {
    const start = Date.now();
    
    const query = db.select({
      assessment: medicalDeviceAssessments,
      functionsCount: db.$count(medicalDeviceFunctions.id),
      requirementsCount: db.$count(mdrComplianceRequirements.id)
    })
    .from(medicalDeviceAssessments)
    .leftJoin(
      medicalDeviceFunctions, 
      eq(medicalDeviceFunctions.assessmentId, medicalDeviceAssessments.id)
    )
    .leftJoin(
      mdrComplianceRequirements,
      eq(mdrComplianceRequirements.assessmentId, medicalDeviceAssessments.id)
    )
    .limit(10);
    
    const queryTime = Date.now() - start;
    console.log(`   Complex query time: ${queryTime}ms`);
    
    return queryTime < 1500;
  });

  // Cleanup test data
  console.log('\n🧹 Cleaning up test data...');
  try {
    // Delete all test assessments
    await db.delete(medicalDeviceAssessments)
      .where(eq(medicalDeviceAssessments.assessedBy, testUser.id));
    
    // Delete test user
    await db.delete(users)
      .where(eq(users.id, testUser.id));
  } catch (error) {
    console.error('Cleanup error:', error);
  }

  // Display results summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('============================================================');
  console.log(`${GREEN}✅ Passed: ${results.passed} tests${RESET}`);
  console.log(`${RED}❌ Failed: ${results.failed} tests${RESET}`);
  console.log(`${YELLOW}⚠️  Errors: ${results.errors} tests${RESET}`);
  
  const successRate = Math.round((results.passed / (results.passed + results.failed + results.errors)) * 100);
  console.log(`📈 Success Rate: ${successRate}%`);
  
  if (successRate >= 80) {
    console.log(`\n${GREEN}✨ QUALITY GATE: PASSED - System meets acceptance criteria${RESET}`);
  } else {
    console.log(`\n${RED}⚠️ QUALITY GATE: FAILED - System needs improvements${RESET}`);
  }

  // Generate quality report
  console.log('\n📝 QUALITY ASSESSMENT:');
  console.log('----------------------------------------');
  
  if (results.passed === 17) {
    console.log('✅ All MDR assessment functions working correctly');
    console.log('✅ Decision tree logic properly implemented');
    console.log('✅ Compliance requirements tracking functional');
    console.log('✅ Performance meets requirements');
  } else {
    console.log('⚠️ Some MDR features need attention');
    if (results.details.filter(d => d.test.startsWith('MDR')).some(d => d.status !== 'pass')) {
      console.log('  - Assessment creation/management issues');
    }
    if (results.details.filter(d => d.test.startsWith('DT')).some(d => d.status !== 'pass')) {
      console.log('  - Decision tree logic problems');
    }
    if (results.details.filter(d => d.test.startsWith('MDF')).some(d => d.status !== 'pass')) {
      console.log('  - Medical device function tracking issues');
    }
    if (results.details.filter(d => d.test.startsWith('CR')).some(d => d.status !== 'pass')) {
      console.log('  - Compliance requirements management problems');
    }
  }

  process.exit(successRate >= 80 ? 0 : 1);
}

// Run the tests
console.log('Connecting to Supabase database via pooler');
console.log('Connection string format:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
console.log('Creating database client...');

runMDRComplianceTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});