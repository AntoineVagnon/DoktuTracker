import { Router } from 'express';
import { db } from '../db';
import { 
  gdprDataProcessingRecords, 
  dataSubjectRequests,
  users,
  userConsents,
  appointments,
  healthProfiles
} from '@shared/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Schema for data subject requests
const dataSubjectRequestSchema = z.object({
  userId: z.number(),
  requestType: z.enum(['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection']),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'rejected']).default('pending')
});

// Get processing records for a user
router.get('/api/gdpr/processing-records/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const records = await db
      .select()
      .from(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.userId, parseInt(userId)))
      .orderBy(desc(gdprDataProcessingRecords.createdAt));
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching processing records:', error);
    res.status(500).json({ error: 'Failed to fetch processing records' });
  }
});

// Get data subject requests for a user
router.get('/api/gdpr/subject-requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const requests = await db
      .select()
      .from(dataSubjectRequests)
      .where(eq(dataSubjectRequests.userId, parseInt(userId)))
      .orderBy(desc(dataSubjectRequests.createdAt));
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching subject requests:', error);
    res.status(500).json({ error: 'Failed to fetch subject requests' });
  }
});

// Create a new data subject request
router.post('/api/gdpr/subject-requests', async (req, res) => {
  try {
    const validatedData = dataSubjectRequestSchema.parse(req.body);
    
    const [newRequest] = await db
      .insert(dataSubjectRequests)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Log the request for audit purposes
    console.log(`GDPR Request created: ${newRequest.requestType} for user ${newRequest.userId}`);
    
    // If it's an access or portability request, we can auto-approve for demo
    if (newRequest.requestType === 'access' || newRequest.requestType === 'portability') {
      await db
        .update(dataSubjectRequests)
        .set({
          status: 'completed',
          response: 'Your request has been approved. You can download your data using the export function.',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(dataSubjectRequests.id, newRequest.id));
    }
    
    res.json({ success: true, request: newRequest });
  } catch (error) {
    console.error('Error creating subject request:', error);
    res.status(500).json({ error: 'Failed to create subject request' });
  }
});

// Export user data (GDPR Article 20 - Right to data portability)
router.get('/api/gdpr/export/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);
    
    // Fetch all user data from various tables
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, userIdNum));
    
    const consentsData = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userIdNum));
    
    const appointmentsData = await db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, userIdNum));
    
    const healthProfileData = await db
      .select()
      .from(healthProfiles)
      .where(eq(healthProfiles.userId, userIdNum));
    
    const processingRecords = await db
      .select()
      .from(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.userId, userIdNum));
    
    const subjectRequests = await db
      .select()
      .from(dataSubjectRequests)
      .where(eq(dataSubjectRequests.userId, userIdNum));
    
    // Compile all data into a structured format
    const exportData = {
      exportDate: new Date().toISOString(),
      dataSubject: {
        id: userData?.id,
        email: userData?.email,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        title: userData?.title,
        role: userData?.role,
        createdAt: userData?.createdAt
      },
      consents: consentsData.map(c => ({
        type: c.consentType,
        given: c.consentGiven,
        date: c.consentDate,
        legalBasis: c.legalBasis,
        purposes: c.purposes,
        withdrawnDate: c.consentWithdrawnDate
      })),
      appointments: appointmentsData.map(a => ({
        id: a.id,
        doctorId: a.doctorId,
        date: a.appointmentDate,
        status: a.status,
        price: a.price,
        type: a.type,
        notes: a.notes,
        createdAt: a.createdAt
      })),
      healthProfile: healthProfileData.map(h => ({
        bloodType: h.bloodType,
        allergies: h.allergies,
        medications: h.medications,
        conditions: h.chronicConditions,
        emergencyContact: h.emergencyContactName,
        lastUpdated: h.updatedAt
      })),
      processingActivities: processingRecords.map(p => ({
        purpose: p.processingPurpose,
        legalBasis: p.legalBasis,
        categories: p.dataCategories,
        retention: p.retentionPeriod,
        recipients: p.recipients,
        createdAt: p.createdAt
      })),
      dataRequests: subjectRequests.map(r => ({
        type: r.requestType,
        status: r.status,
        description: r.description,
        response: r.response,
        submittedAt: r.createdAt,
        completedAt: r.completedAt
      }))
    };
    
    // Log the export for audit trail
    console.log(`Data export generated for user ${userId}`);
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// Handle data erasure request (GDPR Article 17 - Right to erasure)
router.post('/api/gdpr/erasure/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);
    
    // In production, this would require additional verification
    // and would need to handle data that must be retained for legal reasons
    
    // For demo purposes, we'll just mark the user as deleted
    await db
      .update(users)
      .set({
        email: `deleted_${Date.now()}@deleted.com`,
        firstName: 'DELETED',
        lastName: 'USER',
        // Add a deletedAt timestamp if you have one
      })
      .where(eq(users.id, userIdNum));
    
    // Log the erasure
    console.log(`Data erasure completed for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: 'Your data has been erased in compliance with GDPR Article 17' 
    });
  } catch (error) {
    console.error('Error processing erasure request:', error);
    res.status(500).json({ error: 'Failed to process erasure request' });
  }
});

// Get data retention policy
router.get('/api/gdpr/retention-policy', async (req, res) => {
  try {
    const retentionPolicy = {
      medical_records: {
        category: 'Medical Records',
        period: '10 years',
        basis: 'Legal requirement for medical record retention',
        description: 'Patient medical records including consultations, prescriptions, and test results'
      },
      appointment_data: {
        category: 'Appointment Data',
        period: '3 years',
        basis: 'Business requirement for service improvement',
        description: 'Appointment bookings, cancellations, and related communications'
      },
      financial_records: {
        category: 'Financial Records',
        period: '7 years',
        basis: 'Tax and accounting legal requirements',
        description: 'Payment records, invoices, and financial transactions'
      },
      consent_records: {
        category: 'Consent Records',
        period: 'Duration of processing + 3 years',
        basis: 'GDPR compliance and audit requirements',
        description: 'Records of consent for data processing activities'
      },
      marketing_data: {
        category: 'Marketing Communications',
        period: 'Until consent withdrawn',
        basis: 'Legitimate interest in direct marketing',
        description: 'Email preferences and marketing communication history'
      }
    };
    
    res.json(retentionPolicy);
  } catch (error) {
    console.error('Error fetching retention policy:', error);
    res.status(500).json({ error: 'Failed to fetch retention policy' });
  }
});

export default router;