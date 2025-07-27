import { Express } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const holdSlotSchema = z.object({
  slotId: z.string(),
  sessionId: z.string().optional(),
});

export function setupSlotRoutes(app: Express) {
  // Hold a slot for 15 minutes
  app.post('/api/slots/hold', async (req, res) => {
    try {
      const { slotId, sessionId } = holdSlotSchema.parse(req.body);
      const actualSessionId = sessionId || req.session.id;

      // Rate limiting check - max 10 requests per minute per IP
      const clientIP = req.ip || req.connection.remoteAddress;
      // Note: In production, implement Redis-based rate limiting
      
      await storage.holdSlot(slotId, actualSessionId, 15);
      
      res.json({ 
        success: true, 
        message: 'Slot held for 15 minutes',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });
    } catch (error: any) {
      console.error('Hold slot error:', error);
      res.status(400).json({ error: error.message || 'Failed to hold slot' });
    }
  });

  // Release a held slot
  app.post('/api/slots/release', async (req, res) => {
    try {
      const { slotId } = z.object({ slotId: z.string() }).parse(req.body);
      
      await storage.releaseSlot(slotId);
      
      res.json({ success: true, message: 'Slot released' });
    } catch (error: any) {
      console.error('Release slot error:', error);
      res.status(400).json({ error: error.message || 'Failed to release slot' });
    }
  });

  // Get currently held slot for session
  app.get('/api/slots/held', async (req, res) => {
    try {
      const sessionId = req.session.id;
      const heldSlot = await storage.getHeldSlot(sessionId);
      
      res.json({ heldSlot });
    } catch (error: any) {
      console.error('Get held slot error:', error);
      res.status(500).json({ error: 'Failed to get held slot' });
    }
  });

  // Clean up expired slots (should be called periodically)
  app.post('/api/slots/cleanup', async (req, res) => {
    try {
      await storage.unlockExpiredSlots();
      res.json({ success: true, message: 'Expired slots cleaned up' });
    } catch (error: any) {
      console.error('Cleanup slots error:', error);
      res.status(500).json({ error: 'Failed to cleanup slots' });
    }
  });
}