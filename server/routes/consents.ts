import { Router } from 'express';
import { db } from '../db';
import { userConsents, gdprDataProcessingRecords } from '@shared/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';
import { authenticateToken } from '../middleware/security';

const router = Router();

// Schema for consent submission
const consentSubmissionSchema = z.object({
  consentType: z.enum(['health_data_processing', 'marketing', 'cookies', 'data_sharing']),
  legalBasis: z.enum(['article_9_2_h', 'article_9_2_a', 'article_6_1_a', 'article_6_1_b']),
  consentGiven: z.boolean(),
  documentVersion: z.string(),
  purposes: z.array(z.string()).optional(),
});

// Get current consents for a user
router.get('/consents/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Authorization: Users can only access their own consent data
    if ((req as any).user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied: Can only access your own consent data' });
    }
    
    // Get latest consent for each type
    const consents = await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, parseInt(userId)),
          isNull(userConsents.consentWithdrawnDate)
        )
      )
      .orderBy(desc(userConsents.consentDate));
    
    res.json(consents);
  } catch (error) {
    console.error('Error fetching consents:', error);
    res.status(500).json({ error: 'Failed to fetch consents' });
  }
});

// Submit new consent
router.post('/consents/:userId', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 CONSENT API DEBUG: Starting consent submission');
    console.log('🔍 CONSENT API DEBUG: User ID:', req.params.userId);
    console.log('🔍 CONSENT API DEBUG: Request body:', req.body);
    
    const { userId } = req.params;
    
    // Authorization: Users can only submit consent for themselves
    if ((req as any).user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied: Can only submit consent for yourself' });
    }
    const validatedData = consentSubmissionSchema.parse(req.body);
    
    console.log('🔍 CONSENT API DEBUG: Validated data:', validatedData);
    
    // Get user's IP and user agent for audit trail
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    
    console.log('🔍 CONSENT API DEBUG: IP address:', ipAddress);
    
    const insertData = {
      userId: parseInt(userId),
      ...validatedData,
      ipAddress,
      userAgent,
      consentDate: new Date(),
    };
    
    console.log('🔍 CONSENT API DEBUG: Insert data:', insertData);
    
    // Insert new consent record
    const [newConsent] = await db
      .insert(userConsents)
      .values(insertData)
      .returning();
      
    console.log('🔍 CONSENT API DEBUG: New consent created:', newConsent);
    
    // If this is health data processing consent, create GDPR processing record
    if (validatedData.consentType === 'health_data_processing' && validatedData.consentGiven) {
      await db.insert(gdprDataProcessingRecords).values({
        userId: parseInt(userId),
        processingPurpose: 'Healthcare provision and medical consultation',
        legalBasis: validatedData.legalBasis,
        dataCategories: {
          special: ['health_data', 'medical_history'],
          personal: ['name', 'contact_details', 'date_of_birth'],
        },
        retentionPeriod: '10 years after last consultation',
        recipients: {
          internal: ['healthcare_professionals', 'support_staff'],
          external: ['payment_processors', 'video_platform'],
        },
        securityMeasures: {
          technical: ['encryption', 'access_control', 'audit_logging'],
          organizational: ['staff_training', 'confidentiality_agreements'],
        },
      });
    }
    
    res.json({ success: true, consent: newConsent });
  } catch (error) {
    console.error('Error submitting consent:', error);
    res.status(500).json({ error: 'Failed to submit consent' });
  }
});

// Withdraw consent
router.post('/consents/:userId/withdraw', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Authorization: Users can only withdraw their own consent
    if ((req as any).user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied: Can only withdraw your own consent' });
    }
    const { consentType } = req.body;
    
    // Find the active consent
    const [activeConsent] = await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, parseInt(userId)),
          eq(userConsents.consentType, consentType),
          isNull(userConsents.consentWithdrawnDate)
        )
      )
      .limit(1);
    
    if (!activeConsent) {
      return res.status(404).json({ error: 'No active consent found' });
    }
    
    // Update consent with withdrawal date
    await db
      .update(userConsents)
      .set({ 
        consentWithdrawnDate: new Date(),
      })
      .where(eq(userConsents.id, activeConsent.id));
    
    res.json({ success: true, message: 'Consent withdrawn successfully' });
  } catch (error) {
    console.error('Error withdrawing consent:', error);
    res.status(500).json({ error: 'Failed to withdraw consent' });
  }
});

// Get consent history for a user
router.get('/consents/:userId/history', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Authorization: Users can only access their own consent history
    if ((req as any).user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied: Can only access your own consent history' });
    }
    
    const history = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, parseInt(userId)))
      .orderBy(desc(userConsents.consentDate));
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching consent history:', error);
    res.status(500).json({ error: 'Failed to fetch consent history' });
  }
});

// Get GDPR processing records
router.get('/gdpr/processing-records/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Authorization: Users can only access their own GDPR records
    if ((req as any).user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied: Can only access your own GDPR records' });
    }
    
    const records = await db
      .select()
      .from(gdprDataProcessingRecords)
      .where(eq(gdprDataProcessingRecords.userId, parseInt(userId)))
      .orderBy(desc(gdprDataProcessingRecords.createdAt));
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching GDPR records:', error);
    res.status(500).json({ error: 'Failed to fetch GDPR records' });
  }
});

export default router;