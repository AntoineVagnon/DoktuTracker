import { Router } from 'express';
import { db } from '../db';
import { 
  medicalDeviceAssessments,
  medicalDeviceFunctions,
  mdrComplianceRequirements,
  insertMedicalDeviceAssessmentsSchema,
  insertMedicalDeviceFunctionsSchema,
  insertMdrComplianceRequirementsSchema
} from '../../shared/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Create new MDR assessment
router.post('/api/mdr/assessments', async (req, res) => {
  try {
    const validatedData = insertMedicalDeviceAssessmentsSchema.parse(req.body);
    
    const [assessment] = await db
      .insert(medicalDeviceAssessments)
      .values({
        ...validatedData,
        assessmentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    console.log(`MDR Assessment created: ${assessment.id}`);
    res.json({ success: true, assessment });
  } catch (error) {
    console.error('Error creating MDR assessment:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// Get all assessments
router.get('/api/mdr/assessments', async (req, res) => {
  try {
    const assessments = await db
      .select()
      .from(medicalDeviceAssessments)
      .orderBy(desc(medicalDeviceAssessments.assessmentDate));
    
    res.json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// Get specific assessment
router.get('/api/mdr/assessments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [assessment] = await db
      .select()
      .from(medicalDeviceAssessments)
      .where(eq(medicalDeviceAssessments.id, id));
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    // Get related functions
    const functions = await db
      .select()
      .from(medicalDeviceFunctions)
      .where(eq(medicalDeviceFunctions.assessmentId, id));
    
    // Get compliance requirements
    const requirements = await db
      .select()
      .from(mdrComplianceRequirements)
      .where(eq(mdrComplianceRequirements.assessmentId, id));
    
    res.json({
      assessment,
      functions,
      requirements
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// Update assessment
router.patch('/api/mdr/assessments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [updated] = await db
      .update(medicalDeviceAssessments)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(eq(medicalDeviceAssessments.id, id))
      .returning();
    
    res.json({ success: true, assessment: updated });
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// Add function to assessment
router.post('/api/mdr/assessments/:id/functions', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertMedicalDeviceFunctionsSchema.parse(req.body);
    
    const [func] = await db
      .insert(medicalDeviceFunctions)
      .values({
        ...validatedData,
        assessmentId: id,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    res.json({ success: true, function: func });
  } catch (error) {
    console.error('Error adding function:', error);
    res.status(500).json({ error: 'Failed to add function' });
  }
});

// Add compliance requirement
router.post('/api/mdr/assessments/:id/requirements', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertMdrComplianceRequirementsSchema.parse(req.body);
    
    const [requirement] = await db
      .insert(mdrComplianceRequirements)
      .values({
        ...validatedData,
        assessmentId: id,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    res.json({ success: true, requirement });
  } catch (error) {
    console.error('Error adding requirement:', error);
    res.status(500).json({ error: 'Failed to add requirement' });
  }
});

// Get current active assessment
router.get('/api/mdr/current', async (req, res) => {
  try {
    const [current] = await db
      .select()
      .from(medicalDeviceAssessments)
      .where(eq(medicalDeviceAssessments.complianceStatus, 'compliant'))
      .orderBy(desc(medicalDeviceAssessments.assessmentDate))
      .limit(1);
    
    if (!current) {
      return res.json({
        hasAssessment: false,
        message: 'No compliant assessment found'
      });
    }
    
    res.json({
      hasAssessment: true,
      assessment: current,
      classification: current.medicalDeviceClass,
      requiresCeMark: current.ceMarkingRequired,
      requiresNotifiedBody: current.notifiedBodyRequired
    });
  } catch (error) {
    console.error('Error fetching current assessment:', error);
    res.status(500).json({ error: 'Failed to fetch current assessment' });
  }
});

// MDCG 2019-11 Decision Tree evaluation
router.post('/api/mdr/evaluate', async (req, res) => {
  try {
    const { 
      isSoftware,
      isAccessory,
      processesData,
      benefitIndividualPatients,
      diagnosticFeatures,
      treatmentFeatures,
      monitoringFeatures,
      calculationFeatures
    } = req.body;
    
    // Apply MDCG 2019-11 decision logic
    let classification = 'not_md';
    let riskLevel = 'none';
    let ceMarkingRequired = false;
    let notifiedBodyRequired = false;
    let rationale = '';
    
    if (!isSoftware) {
      rationale = 'Not classified as software - outside MDR scope';
    } else if (isAccessory) {
      classification = 'accessory';
      rationale = 'Classified as accessory to medical device';
      ceMarkingRequired = true;
    } else if (!processesData || !benefitIndividualPatients) {
      rationale = 'Software does not process data for individual patient benefit - not a medical device';
    } else {
      // Evaluate medical functions
      const hasDiagnostic = diagnosticFeatures && diagnosticFeatures.length > 0;
      const hasTreatment = treatmentFeatures && treatmentFeatures.length > 0;
      const hasMonitoring = monitoringFeatures && monitoringFeatures.length > 0;
      const hasCalculation = calculationFeatures && calculationFeatures.length > 0;
      
      if (hasDiagnostic || hasTreatment) {
        classification = 'class_iia';
        riskLevel = 'medium';
        ceMarkingRequired = true;
        notifiedBodyRequired = true;
        rationale = 'Software performs diagnostic or treatment functions - Class IIa medical device';
      } else if (hasMonitoring || hasCalculation) {
        classification = 'class_i';
        riskLevel = 'low';
        ceMarkingRequired = true;
        rationale = 'Software performs monitoring or calculation functions - Class I medical device';
      } else {
        rationale = 'Software facilitates communication only - not a medical device';
      }
    }
    
    res.json({
      classification,
      riskLevel,
      ceMarkingRequired,
      notifiedBodyRequired,
      rationale,
      recommendation: classification === 'not_md' 
        ? 'Continue operating without MDR compliance requirements'
        : `Implement MDR compliance for ${classification} device`
    });
  } catch (error) {
    console.error('Error evaluating MDR classification:', error);
    res.status(500).json({ error: 'Failed to evaluate classification' });
  }
});

export default router;