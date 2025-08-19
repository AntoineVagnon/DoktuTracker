import { Router, Request, Response } from "express";
import { db } from "../db";
import { userConsents, gdprDataProcessingRecords } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { isAuthenticated } from "../supabaseAuth";

const router = Router();

// Get user's current consents
router.get("/users/:userId/consents", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const sessionUserId = (req as any).user?.id;
    
    // Ensure users can only access their own consents
    if (parseInt(userId) !== sessionUserId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const consents = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, parseInt(userId)))
      .orderBy(desc(userConsents.consentDate));

    res.json(consents);
  } catch (error) {
    console.error("Error fetching consents:", error);
    res.status(500).json({ error: "Failed to fetch consent records" });
  }
});

// Update user's consents
router.post("/users/:userId/consents", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { consents } = req.body;
    const sessionUserId = (req as any).user?.id;
    
    // Ensure users can only update their own consents
    if (parseInt(userId) !== sessionUserId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    
    // Process each consent
    for (const consent of consents) {
      // Check if consent exists
      const existing = await db
        .select()
        .from(userConsents)
        .where(
          and(
            eq(userConsents.userId, parseInt(userId)),
            eq(userConsents.consentType, consent.consentType)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing consent
        if (existing[0].consentGiven !== consent.consentGiven) {
          // Insert new record for audit trail
          await db.insert(userConsents).values({
            userId: parseInt(userId),
            consentType: consent.consentType,
            legalBasis: consent.legalBasis,
            consentGiven: consent.consentGiven,
            consentDate: new Date(),
            consentWithdrawnDate: consent.consentGiven ? null : new Date(),
            documentVersion: '1.0',
            ipAddress,
            userAgent,
          });
        }
      } else {
        // Insert new consent
        await db.insert(userConsents).values({
          userId: parseInt(userId),
          consentType: consent.consentType,
          legalBasis: consent.legalBasis,
          consentGiven: consent.consentGiven,
          consentDate: new Date(),
          documentVersion: '1.0',
          ipAddress,
          userAgent,
        });
      }
    }

    // Record data processing activity
    await db.insert(gdprDataProcessingRecords).values({
      userId: parseInt(userId),
      processingPurpose: 'consent_management',
      legalBasis: 'article_6_1_a',
      dataCategories: { consents: consents.map((c: any) => c.consentType) },
      retentionPeriod: '3_years_after_withdrawal',
    });

    res.json({ success: true, message: "Consents updated successfully" });
  } catch (error) {
    console.error("Error updating consents:", error);
    res.status(500).json({ error: "Failed to update consent records" });
  }
});

// Withdraw specific consent
router.delete("/users/:userId/consents/:consentType", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId, consentType } = req.params;
    const sessionUserId = (req as any).user?.id;
    
    // Ensure users can only withdraw their own consents
    if (parseInt(userId) !== sessionUserId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.socket.remoteAddress || '';

    // Record consent withdrawal
    await db.insert(userConsents).values({
      userId: parseInt(userId),
      consentType,
      legalBasis: 'withdrawn',
      consentGiven: false,
      consentDate: new Date(),
      consentWithdrawnDate: new Date(),
      documentVersion: '1.0',
      ipAddress,
      userAgent,
    });

    res.json({ success: true, message: "Consent withdrawn successfully" });
  } catch (error) {
    console.error("Error withdrawing consent:", error);
    res.status(500).json({ error: "Failed to withdraw consent" });
  }
});

// Get consent history for audit purposes
router.get("/users/:userId/consents/history", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const sessionUserId = (req as any).user?.id;
    const sessionUserRole = (req as any).user?.role;
    
    // Allow users to access their own history or admins to access any
    if (parseInt(userId) !== sessionUserId && sessionUserRole !== 'admin') {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const history = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, parseInt(userId)))
      .orderBy(desc(userConsents.consentDate));

    res.json(history);
  } catch (error) {
    console.error("Error fetching consent history:", error);
    res.status(500).json({ error: "Failed to fetch consent history" });
  }
});

export default router;