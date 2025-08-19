import { Router } from 'express';
import { db } from '../db';
import { 
  doctorQualifications,
  professionalInsurance,
  crossBorderDeclarations,
  euProfessionalCards,
  doctors,
  insertDoctorQualificationsSchema,
  insertProfessionalInsuranceSchema,
  insertCrossBorderDeclarationsSchema,
  insertEuProfessionalCardsSchema
} from '../../shared/schema';
import { eq, desc, and, or, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Get all qualifications for a doctor
router.get('/api/doctors/:doctorId/qualifications', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const qualifications = await db
      .select()
      .from(doctorQualifications)
      .where(eq(doctorQualifications.doctorId, parseInt(doctorId)))
      .orderBy(desc(doctorQualifications.createdAt));
    
    res.json(qualifications);
  } catch (error) {
    console.error('Error fetching qualifications:', error);
    res.status(500).json({ error: 'Failed to fetch qualifications' });
  }
});

// Add new qualification
router.post('/api/doctors/:doctorId/qualifications', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const validatedData = insertDoctorQualificationsSchema.parse({
      ...req.body,
      doctorId: parseInt(doctorId)
    });
    
    const [qualification] = await db
      .insert(doctorQualifications)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    console.log(`Qualification added for doctor ${doctorId}: ${qualification.id}`);
    res.json({ success: true, qualification });
  } catch (error) {
    console.error('Error adding qualification:', error);
    res.status(500).json({ error: 'Failed to add qualification' });
  }
});

// Update qualification
router.patch('/api/qualifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [updated] = await db
      .update(doctorQualifications)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(eq(doctorQualifications.id, id))
      .returning();
    
    res.json({ success: true, qualification: updated });
  } catch (error) {
    console.error('Error updating qualification:', error);
    res.status(500).json({ error: 'Failed to update qualification' });
  }
});

// Verify qualification
router.post('/api/qualifications/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationMethod, verificationReference, status } = req.body;
    
    const [verified] = await db
      .update(doctorQualifications)
      .set({
        verificationStatus: status || 'verified',
        verificationDate: new Date().toISOString().split('T')[0],
        verificationMethod,
        verificationReference,
        updatedAt: new Date()
      })
      .where(eq(doctorQualifications.id, id))
      .returning();
    
    res.json({ success: true, qualification: verified });
  } catch (error) {
    console.error('Error verifying qualification:', error);
    res.status(500).json({ error: 'Failed to verify qualification' });
  }
});

// Get insurance for a doctor
router.get('/api/doctors/:doctorId/insurance', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const insurance = await db
      .select()
      .from(professionalInsurance)
      .where(eq(professionalInsurance.doctorId, parseInt(doctorId)))
      .orderBy(desc(professionalInsurance.effectiveDate));
    
    res.json(insurance);
  } catch (error) {
    console.error('Error fetching insurance:', error);
    res.status(500).json({ error: 'Failed to fetch insurance' });
  }
});

// Add insurance
router.post('/api/doctors/:doctorId/insurance', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const validatedData = insertProfessionalInsuranceSchema.parse({
      ...req.body,
      doctorId: parseInt(doctorId)
    });
    
    const [insurance] = await db
      .insert(professionalInsurance)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    res.json({ success: true, insurance });
  } catch (error) {
    console.error('Error adding insurance:', error);
    res.status(500).json({ error: 'Failed to add insurance' });
  }
});

// Get cross-border declarations
router.get('/api/doctors/:doctorId/cross-border', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const declarations = await db
      .select()
      .from(crossBorderDeclarations)
      .where(eq(crossBorderDeclarations.doctorId, parseInt(doctorId)))
      .orderBy(desc(crossBorderDeclarations.declarationDate));
    
    res.json(declarations);
  } catch (error) {
    console.error('Error fetching declarations:', error);
    res.status(500).json({ error: 'Failed to fetch declarations' });
  }
});

// Add cross-border declaration
router.post('/api/doctors/:doctorId/cross-border', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const validatedData = insertCrossBorderDeclarationsSchema.parse({
      ...req.body,
      doctorId: parseInt(doctorId)
    });
    
    const [declaration] = await db
      .insert(crossBorderDeclarations)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    res.json({ success: true, declaration });
  } catch (error) {
    console.error('Error adding declaration:', error);
    res.status(500).json({ error: 'Failed to add declaration' });
  }
});

// Get EU Professional Card
router.get('/api/doctors/:doctorId/epc', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const [card] = await db
      .select()
      .from(euProfessionalCards)
      .where(eq(euProfessionalCards.doctorId, parseInt(doctorId)))
      .limit(1);
    
    if (!card) {
      return res.json({ hasCard: false });
    }
    
    res.json({ hasCard: true, card });
  } catch (error) {
    console.error('Error fetching EPC:', error);
    res.status(500).json({ error: 'Failed to fetch EPC' });
  }
});

// Add/Update EU Professional Card
router.post('/api/doctors/:doctorId/epc', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const validatedData = insertEuProfessionalCardsSchema.parse({
      ...req.body,
      doctorId: parseInt(doctorId)
    });
    
    const [card] = await db
      .insert(euProfessionalCards)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    res.json({ success: true, card });
  } catch (error) {
    console.error('Error adding EPC:', error);
    res.status(500).json({ error: 'Failed to add EPC' });
  }
});

// Verification status summary for a doctor
router.get('/api/doctors/:doctorId/verification-status', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const id = parseInt(doctorId);
    
    // Get doctor info
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.id, id));
    
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    // Get qualifications status
    const qualifications = await db
      .select({
        total: db.$count(doctorQualifications.id),
        verified: db.$count(
          and(
            eq(doctorQualifications.doctorId, id),
            eq(doctorQualifications.verificationStatus, 'verified')
          )
        ),
        expired: db.$count(
          and(
            eq(doctorQualifications.doctorId, id),
            eq(doctorQualifications.verificationStatus, 'expired')
          )
        )
      })
      .from(doctorQualifications)
      .where(eq(doctorQualifications.doctorId, id));
    
    // Get insurance status
    const insurance = await db
      .select()
      .from(professionalInsurance)
      .where(
        and(
          eq(professionalInsurance.doctorId, id),
          gte(professionalInsurance.expiryDate, new Date().toISOString().split('T')[0])
        )
      );
    
    // Get EPC status
    const [epc] = await db
      .select()
      .from(euProfessionalCards)
      .where(eq(euProfessionalCards.doctorId, id))
      .limit(1);
    
    // Get active cross-border declarations
    const activeDeclarations = await db
      .select()
      .from(crossBorderDeclarations)
      .where(
        and(
          eq(crossBorderDeclarations.doctorId, id),
          eq(crossBorderDeclarations.status, 'approved'),
          or(
            eq(crossBorderDeclarations.validityEndDate, null),
            gte(crossBorderDeclarations.validityEndDate, new Date().toISOString().split('T')[0])
          )
        )
      );
    
    const verificationComplete = 
      qualifications[0]?.verified > 0 &&
      insurance.length > 0 &&
      insurance[0].verificationStatus === 'verified';
    
    res.json({
      doctor: {
        id: doctor.id,
        name: `${doctor.title} ${doctor.firstName} ${doctor.lastName}`,
        verificationLevel: doctor.verificationLevel
      },
      qualifications: {
        total: qualifications[0]?.total || 0,
        verified: qualifications[0]?.verified || 0,
        expired: qualifications[0]?.expired || 0
      },
      insurance: {
        hasValidInsurance: insurance.length > 0,
        verified: insurance.length > 0 && insurance[0].verificationStatus === 'verified',
        expiryDate: insurance[0]?.expiryDate || null
      },
      euProfessionalCard: {
        hasCard: !!epc,
        cardNumber: epc?.epcNumber || null,
        expiryDate: epc?.expiryDate || null
      },
      crossBorderPractice: {
        activeDeclarations: activeDeclarations.length,
        countries: activeDeclarations.map(d => d.hostMemberState)
      },
      overallStatus: verificationComplete ? 'verified' : 'pending',
      canPractice: verificationComplete
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

// Simulate EU database verification
router.post('/api/qualifications/:id/eu-verify', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Simulate EU database check
    const simulatedResponse = {
      verified: Math.random() > 0.2, // 80% success rate
      database: 'EU Professional Qualifications Database',
      timestamp: new Date().toISOString(),
      reference: `EU-VERIFY-${Date.now()}`,
      recognizedCountries: ['FR', 'DE', 'ES', 'IT', 'BE', 'NL', 'LU']
    };
    
    if (simulatedResponse.verified) {
      await db
        .update(doctorQualifications)
        .set({
          verificationStatus: 'verified',
          verificationDate: new Date().toISOString().split('T')[0],
          verificationMethod: 'EU Database Check',
          verificationReference: simulatedResponse.reference,
          euRecognitionStatus: 'automatic',
          hostMemberStates: simulatedResponse.recognizedCountries,
          updatedAt: new Date()
        })
        .where(eq(doctorQualifications.id, id));
    }
    
    res.json({
      success: simulatedResponse.verified,
      verificationResult: simulatedResponse
    });
  } catch (error) {
    console.error('Error in EU verification:', error);
    res.status(500).json({ error: 'EU verification failed' });
  }
});

export default router;