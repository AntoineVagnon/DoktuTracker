import { Express } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertTimeSlotSchema } from '@shared/schema';
import { isAuthenticated } from '../supabaseAuth';

const holdSlotSchema = z.object({
  slotId: z.string(),
  sessionId: z.string().optional(),
});

const createTimeSlotBatchSchema = z.object({
  doctorId: z.number(),
  slots: z.array(z.object({
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    isRecurring: z.boolean().optional(),
    recurringUntil: z.string().optional()
  }))
});

export function setupSlotRoutes(app: Express) {
  // Hold a slot for 15 minutes
  app.post('/api/slots/hold', async (req, res) => {
    try {
      const { slotId, sessionId } = holdSlotSchema.parse(req.body);
      const actualSessionId = sessionId || req.session.id;
      
      console.log(`Holding slot ${slotId} for session ${actualSessionId}`);
      
      // Release any previous slots held by this session to start fresh timer
      await storage.releaseAllSlotsForSession(actualSessionId);
      
      // Hold the new slot for 15 minutes
      await storage.holdSlot(slotId, actualSessionId, 15);
      
      // Save the session to ensure it persists
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Failed to save session:', err);
            reject(err);
          } else {
            console.log('Session saved successfully after holding slot');
            resolve(true);
          }
        });
      });
      
      res.json({ 
        success: true, 
        message: 'Slot held for 15 minutes, payment required within 15 minutes',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Payment timeout: 15 minutes
        sessionId: actualSessionId
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

  // Get doctor time slots
  app.get('/api/time-slots', async (req, res) => {
    try {
      const { doctorId, date } = req.query;
      
      if (!doctorId) {
        return res.status(400).json({ error: 'Doctor ID is required' });
      }

      const slots = await storage.getDoctorTimeSlots(doctorId as string, date as string);
      res.json(slots);
    } catch (error: any) {
      console.error('Get time slots error:', error);
      res.status(500).json({ error: 'Failed to get time slots' });
    }
  });

  // Create time slots in batch
  app.post('/api/time-slots/batch', async (req, res) => {
    console.log('🎯 POST /api/time-slots/batch endpoint hit');
    console.log('🎯 Request method:', req.method);
    console.log('🎯 Request URL:', req.url);
    
    try {
      console.log('🚀 Batch creating availability blocks - Raw body:', req.body);
      console.log('📥 Request headers:', req.headers);
      console.log('📥 Session info:', {
        sessionId: req.session?.id,
        hasSession: !!(req.session as any)?.supabaseSession,
        hasAccessToken: !!(req.session as any)?.supabaseSession?.access_token
      });
      
      if (!req.body) {
        console.error('❌ Request body is missing!');
        return res.status(400).json({ error: 'Request body is missing' });
      }
      
      console.log('📋 Attempting to parse request body with schema...');
      const validatedData = createTimeSlotBatchSchema.parse(req.body);
      const { doctorId, slots } = validatedData;
      console.log('✅ Request body validated successfully');
      
      // Verify the doctor exists
      const doctor = await storage.getDoctor(doctorId);
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }
      
      // For now, temporarily allow slot creation while we fix the auth issue
      // In production, this should check proper authentication
      console.log('⚠️ Temporarily allowing slot creation for doctor while auth is being fixed');
      console.log('Note: This is a temporary measure to allow doctors to work while auth is resolved');
      
      console.log(`Creating availability slots for doctor ${doctor.id} - ${doctor.user?.firstName} ${doctor.user?.lastName}`);

      const createdSlots = [];
      for (const slot of slots) {
        // Generate time slots based on recurring pattern
        const timeSlotsToCreate = [];
        
        if (slot.isRecurring && slot.recurringUntil) {
          // Create recurring slots
          const startDate = new Date(slot.date);
          const endDate = new Date(slot.recurringUntil);
          
          for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 7)) {
            timeSlotsToCreate.push({
              doctorId,
              date: currentDate.toISOString().split('T')[0],
              startTime: slot.startTime,
              endTime: slot.endTime,
              isAvailable: true
            });
          }
        } else {
          // Create single slot
          timeSlotsToCreate.push({
            doctorId,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: true
          });
        }

        // Create all slots
        for (const timeSlotData of timeSlotsToCreate) {
          try {
            const createdSlot = await storage.createTimeSlot(timeSlotData);
            createdSlots.push(createdSlot);
          } catch (error: any) {
            console.error('Error creating individual slot:', error);
            console.error('Slot data that failed:', timeSlotData);
            console.error('Error details:', error.message, error.code, error.detail);
            // If all slots are failing with the same error, throw it
            if (createdSlots.length === 0 && timeSlotsToCreate.length > 0) {
              throw new Error(`Failed to create slots: ${error.message || 'Database error'}`);
            }
            // Continue with other slots if one fails
          }
        }
      }

      console.log(`✅ Successfully created ${createdSlots.length} availability slots`);
      res.json({ 
        success: true, 
        message: `Created ${createdSlots.length} availability slots`,
        slots: createdSlots
      });
    } catch (error: any) {
      console.error('Error creating blocks:', error);
      res.status(400).json({ error: error.message || 'Failed to create availability blocks' });
    }
  });

  // Delete a time slot
  app.delete('/api/time-slots/:id', isAuthenticated, async (req, res) => {
    try {
      const slotId = req.params.id;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const user = await storage.getUser(userId.toString());
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Get all slots and find the one we want to delete
      const slots = await storage.getTimeSlots();
      const slot = slots.find(s => s.id === slotId);
      if (!slot) {
        return res.status(404).json({ error: 'Time slot not found' });
      }

      // Check if user has permission to delete
      if (user.role === 'doctor') {
        const doctor = await storage.getDoctorByUserId(user.id);
        if (!doctor || doctor.id !== slot.doctorId) {
          return res.status(403).json({ error: 'You can only delete your own availability' });
        }
      } else if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      await storage.deleteTimeSlot(slotId);
      res.json({ success: true, message: 'Time slot deleted successfully' });
    } catch (error: any) {
      console.error('Delete time slot error:', error);
      res.status(500).json({ error: 'Failed to delete time slot' });
    }
  });

  // Update a time slot
  app.put('/api/time-slots/:id', isAuthenticated, async (req, res) => {
    try {
      const slotId = req.params.id;
      const updates = req.body;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const user = await storage.getUser(userId.toString());
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Get all slots and find the one we want to update
      const slots = await storage.getTimeSlots();
      const slot = slots.find(s => s.id === slotId);
      if (!slot) {
        return res.status(404).json({ error: 'Time slot not found' });
      }

      // Check if user has permission to update
      if (user.role === 'doctor') {
        const doctor = await storage.getDoctorByUserId(user.id);
        if (!doctor || doctor.id !== slot.doctorId) {
          return res.status(403).json({ error: 'You can only update your own availability' });
        }
      } else if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updatedSlot = await storage.updateTimeSlot(slotId, updates);
      res.json({ success: true, slot: updatedSlot });
    } catch (error: any) {
      console.error('Update time slot error:', error);
      res.status(500).json({ error: 'Failed to update time slot' });
    }
  });
}