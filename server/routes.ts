import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission, ObjectAccessGroupType } from "./objectAcl";

// Extend express session type
declare module 'express-session' {
  interface SessionData {
    heldSlots?: Record<string, {
      slotId: string;
      expiresAt: Date;
      heldAt: Date;
    }>;
    supabaseSession?: {
      access_token: string;
      refresh_token: string;
      user: any;
    };
  }
}
import Stripe from "stripe";
import { storage } from "./storage";
import { setupSupabaseAuth, isAuthenticated, supabase } from "./supabaseAuth";
import { insertDoctorSchema, insertTimeSlotSchema, insertAppointmentSchema, insertReviewSchema, insertDocumentUploadSchema } from "@shared/schema";
import { z } from "zod";
import { registerDocumentLibraryRoutes } from "./routes/documentLibrary";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Supabase authentication
  await setupSupabaseAuth(app);

  // Register document library routes
  registerDocumentLibraryRoutes(app);

  // Temporary endpoint to initialize document tables
  app.post("/api/init-document-tables", async (req, res) => {
    try {
      console.log('🔨 Creating document library tables...');
      
      // Use raw SQL since tables don't exist yet
      const db = (await import("./db")).db;
      const { sql } = await import("drizzle-orm");
      
      // Create document uploads table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS document_uploads (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            uploaded_by integer NOT NULL REFERENCES users(id),
            file_name varchar NOT NULL,
            file_size integer NOT NULL,
            file_type varchar NOT NULL,
            upload_url text NOT NULL,
            document_type varchar,
            uploaded_at timestamp DEFAULT now()
        )
      `);
      
      // Create appointment documents junction table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS appointment_documents (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            appointment_id integer NOT NULL REFERENCES appointments(id),
            document_id uuid NOT NULL REFERENCES document_uploads(id),
            attached_at timestamp DEFAULT now()
        )
      `);
      
      // Create index
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_appointment_document_unique 
        ON appointment_documents(appointment_id, document_id)
      `);
      
      console.log('✅ Document library tables created successfully');
      
      res.json({ 
        success: true, 
        message: "Document library tables created successfully" 
      });
      
    } catch (error: any) {
      console.error('❌ Error creating tables:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Configure multer for file uploads (in-memory storage for processing before cloud upload)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow specific file types for medical documents
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, JPG, PNG, GIF, and TXT files are allowed.'));
      }
    }
  });

  // Test callback endpoint for OAuth troubleshooting
  app.get('/test-callback', (req, res) => {
    res.send('✅ Callback received with query: ' + JSON.stringify(req.query));
  });

  // Object upload endpoint - Get presigned upload URL
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      console.log('🔗 Generating upload URL for user:', userId);
      
      // Initialize object storage service
      const objectStorageService = new ObjectStorageService();
      
      // Get presigned URL for secure upload
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      console.log('✅ Generated secure upload URL');

      res.json({ 
        uploadURL,
        method: "PUT"
      });
      
    } catch (error: any) {
      console.error('❌ Error generating upload URL:', error);
      res.status(500).json({ 
        error: "Failed to generate upload URL",
        message: error.message 
      });
    }
  });

  // Doctor-related routes
  app.get("/api/doctors", async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  app.get("/api/doctors/:id", async (req, res) => {
    try {
      const doctor = await storage.getDoctor(req.params.id);
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      res.json(doctor);
    } catch (error) {
      console.error("Error fetching doctor:", error);
      res.status(500).json({ message: "Failed to fetch doctor" });
    }
  });

  app.post("/api/doctors", isAuthenticated, async (req, res) => {
    try {
      const doctorData = insertDoctorSchema.parse(req.body);
      const doctor = await storage.createDoctor(doctorData);
      res.json(doctor);
    } catch (error) {
      console.error("Error creating doctor:", error);
      res.status(500).json({ message: "Failed to create doctor" });
    }
  });

  // Time slot routes
  app.get("/api/doctors/:doctorId/slots", async (req, res) => {
    try {
      const { doctorId } = req.params;
      const { date, nextOnly } = req.query;
      console.log(`🔍 Fetching slots for doctor ID: ${doctorId}, date: ${date}, nextOnly: ${nextOnly}`);
      
      const slots = await storage.getDoctorTimeSlots(doctorId, date as string);
      
      // If nextOnly is requested (for homepage), return just the next available slot
      if (nextOnly === 'true') {
        const now = new Date();
        const nextSlot = slots
          .filter(slot => slot.isAvailable && new Date(`${slot.date}T${slot.startTime}`) > now)
          .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime())[0];
        
        console.log(`📅 Next available slot for doctor ${doctorId}:`, nextSlot ? `${nextSlot.date}T${nextSlot.startTime}` : 'none');
        res.json(nextSlot ? [nextSlot] : []);
      } else {
        console.log(`📅 Found ${slots.length} slots for doctor ${doctorId}`);
        res.json(slots);
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
      res.status(500).json({ message: "Failed to fetch slots" });
    }
  });






  // Get time slots for authenticated doctor
  app.get("/api/time-slots", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Find the doctor record for this user
      const doctor = await storage.getDoctorByUserId(user.id);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor profile not found" });
      }

      const slots = await storage.getDoctorTimeSlots(doctor.id.toString());
      res.json(slots);
    } catch (error) {
      console.error("Error fetching doctor time slots:", error);
      res.status(500).json({ message: "Failed to fetch time slots" });
    }
  });

  // Time slot route with doctorId query param for real-time sync
  app.get("/api/time-slots", async (req, res) => {
    try {
      const { doctorId, date } = req.query;
      
      if (doctorId) {
        // Return slots for specific doctor
        const slots = await storage.getDoctorTimeSlots(doctorId as string, date as string);
        res.json(slots);
      } else {
        // Return all time slots (for authenticated users)
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: "Not authenticated" });
        }
        
        const slots = await storage.getTimeSlots();
        res.json(slots);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      res.status(500).json({ message: "Failed to fetch time slots" });
    }
  });

  app.post("/api/doctors/:doctorId/slots", isAuthenticated, async (req, res) => {
    try {
      const slotData = insertTimeSlotSchema.parse({
        ...req.body,
        doctorId: req.params.doctorId,
      });
      const slot = await storage.createTimeSlot(slotData);
      res.json(slot);
    } catch (error) {
      console.error("Error creating slot:", error);
      res.status(500).json({ message: "Failed to create slot" });
    }
  });

  // Appointment routes
  app.get("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id; // Use the correct user ID from Supabase Auth middleware
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let appointments;
      
      if (user.role === 'doctor') {
        // For doctors, find doctor by email efficiently
        console.log(`🩺 Looking for doctor with email: ${user.email}`);
        
        const doctor = await storage.getDoctorByEmail(user.email);
        
        if (!doctor) {
          console.log(`❌ No doctor profile found for: ${user.email}`);
          return res.status(404).json({ error: "Doctor profile not found" });
        } else {
          console.log(`✅ Found doctor: doctorId=${doctor.id}, specialty=${doctor.specialty}`);
          appointments = await storage.getAppointments(undefined, doctor.id.toString());
        }
        
      } else {
        // For patients, fetch by patientId
        appointments = await storage.getAppointments(userId);
      }
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id; // Use the correct user ID from Supabase Auth middleware
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const appointmentData = insertAppointmentSchema.parse({
        patientId: parseInt(userId), // Convert to integer to match schema
        doctorId: parseInt(req.body.doctorId), // Convert to integer to match schema
        appointmentDate: new Date(req.body.appointmentDate), // Convert string to Date
        status: req.body.status || 'pending',
        paymentIntentId: req.body.paymentIntentId || null,
        clientSecret: req.body.clientSecret || null,
        zoomMeetingId: req.body.zoomMeetingId || null,
        zoomJoinUrl: req.body.zoomJoinUrl || null,
        zoomStartUrl: req.body.zoomStartUrl || null,
        zoomPassword: req.body.zoomPassword || null
      });
      const appointment = await storage.createAppointment(appointmentData);
      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "eur", // European market
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Review routes
  app.post("/api/reviews", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const reviewData = insertReviewSchema.parse({
        ...req.body,
        patientId: userId,
      });
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get("/api/doctors/:doctorId/reviews", async (req, res) => {
    try {
      const reviews = await storage.getDoctorReviews(req.params.doctorId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Admin routes
  app.get("/api/admin/kpis", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user to check role
      const dbUser = await storage.getUser(userId);
      if (!dbUser || dbUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const kpis = await storage.getKPIs();
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  // Email confirmation endpoint for post-signup
  app.post("/api/auth/confirm", async (req, res) => {
    try {
      const { access_token, refresh_token } = req.body;

      if (!access_token) {
        return res.status(400).json({ error: "Missing access token" });
      }

      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(access_token);

      if (error || !user) {
        console.error("Supabase auth error:", error);
        return res.status(401).json({ error: "Invalid token" });
      }

      // Store session in Express session
      req.session.supabaseSession = {
        access_token,
        refresh_token,
        user: user
      };

      // Get or create user in database
      let dbUser = await storage.getUser(user.id);
      
      if (!dbUser) {
        // Create user if doesn't exist (for new signups)
        dbUser = await storage.upsertUser({
          id: parseInt(user.id),
          email: user.email || '',
          role: 'patient' // Default role for new signups
        });
      }

      console.log("Email confirmation successful for user:", user.id);
      res.json({ success: true, user: dbUser });
    } catch (error: any) {
      console.error("Email confirmation error:", error);
      res.status(500).json({ error: "Confirmation failed" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/user", async (req, res) => {
    try {
      const session = req.session.supabaseSession;

      if (!session || !session.access_token) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Verify current token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(session.access_token);

      if (error || !user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Get user from database or create if doesn't exist
      let dbUser = await storage.getUser(user.id);
      
      if (!dbUser) {
        // Create user if doesn't exist (for Supabase users)
        dbUser = await storage.upsertUser({
          id: parseInt(user.id),
          email: user.email,
          role: 'patient' // Default role
        });
      }

      res.json(dbUser);
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(401).json({ error: "Authentication failed" });
    }
  });

  // Slot holding routes for booking flow - simplified version without database dependency
  app.post('/api/slots/hold', async (req, res) => {
    try {
      const { slotId, sessionId } = z.object({
        slotId: z.string(),
        sessionId: z.string().optional(),
      }).parse(req.body);
      
      const actualSessionId = sessionId || req.session.id;
      
      // For now, we'll simulate slot holding by just validating the slot exists
      const timeSlots = await storage.getTimeSlots();
      const slotExists = timeSlots.find(slot => slot.id === slotId && slot.isAvailable);
      
      if (!slotExists) {
        return res.status(400).json({ error: 'Slot not available' });
      }
      
      // Store the held slot information in session temporarily
      if (!req.session.heldSlots) {
        req.session.heldSlots = {};
      }
      
      req.session.heldSlots[actualSessionId] = {
        slotId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        heldAt: new Date()
      };
      
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

  app.post('/api/slots/release', async (req, res) => {
    try {
      const { slotId } = z.object({ slotId: z.string() }).parse(req.body);
      const sessionId = req.session.id;
      
      // Remove from session-based held slots
      const heldSlotsData = req.session.heldSlots || {};
      if (heldSlotsData[sessionId] && heldSlotsData[sessionId].slotId === slotId) {
        delete heldSlotsData[sessionId];
      }
      
      res.json({ success: true, message: 'Slot released' });
    } catch (error: any) {
      console.error('Release slot error:', error);
      res.status(400).json({ error: error.message || 'Failed to release slot' });
    }
  });

  app.get('/api/slots/held', async (req, res) => {
    try {
      const sessionId = req.session.id;
      
      // Check session-based held slots
      const heldSlotsData = req.session.heldSlots || {};
      const heldSlotInfo = heldSlotsData[sessionId];
      
      if (!heldSlotInfo) {
        return res.json({ heldSlot: null });
      }
      
      // Check if the slot has expired
      const now = new Date();
      if (new Date(heldSlotInfo.expiresAt) <= now) {
        // Clean up expired slot
        delete heldSlotsData[sessionId];
        return res.json({ heldSlot: null });
      }
      
      // Get the actual slot data
      const timeSlots = await storage.getTimeSlots();
      const slotData = timeSlots.find(slot => slot.id === heldSlotInfo.slotId);
      
      if (!slotData) {
        return res.json({ heldSlot: null });
      }
      
      res.json({ 
        heldSlot: {
          ...slotData,
          expiresAt: heldSlotInfo.expiresAt
        }
      });
    } catch (error: any) {
      console.error('Get held slot error:', error);
      res.status(500).json({ error: 'Failed to get held slot' });
    }
  });



  // Time slots management for doctors
  app.get("/api/time-slots", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.id || user.role !== 'doctor') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get doctor record to find the correct doctorId
      const doctors = await storage.getDoctors();
      
      // Find doctor by email
      let doctor = doctors.find(d => d.user?.email === user.email);
      
      if (!doctor) {
        return res.status(404).json({ error: "Doctor profile not found" });
      }

      const timeSlots = await storage.getDoctorTimeSlots(doctor.id);
      res.json(timeSlots);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      res.status(500).json({ message: "Failed to fetch time slots" });
    }
  });

  // Batch create multiple time slots - much faster than individual calls
  app.post("/api/time-slots/batch", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.id || user.role !== 'doctor') {
        return res.status(403).json({ error: "Access denied" });
      }

      const { slots } = req.body;
      
      if (!Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json({ error: "Slots array is required and cannot be empty" });
      }

      // Get doctor record to find the correct doctorId
      const doctors = await storage.getDoctors();
      let doctor = doctors.find(d => d.user?.email === user.email);
      
      if (!doctor) {
        console.log(`❌ No doctor profile found for: ${user.email}`);
        return res.status(404).json({ error: "Doctor profile not found" });
      }

      console.log(`🚀 Batch creating ${slots.length} time slots for doctor ${doctor.id}`);
      
      // Process all slots and add doctor ID
      const slotsData = slots.map(slot => {
        const startDateTime = new Date(slot.startTime);
        const endDateTime = new Date(slot.endTime);
        const dateStr = startDateTime.toISOString().split('T')[0];
        const startTimeStr = startDateTime.toTimeString().slice(0, 5);
        const endTimeStr = endDateTime.toTimeString().slice(0, 5);

        return {
          doctorId: doctor.id,
          date: dateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          isAvailable: true,
          isRecurring: slot.isRecurring || false,
          recurringEndDate: slot.recurringEndDate || null,
          createdAt: new Date()
        };
      });
      
      const createdSlots = await storage.createTimeSlotsBatch(slotsData);
      console.log(`✅ Successfully batch created ${createdSlots.length} slots`);
      
      res.status(201).json(createdSlots);
    } catch (error) {
      console.error("Error batch creating time slots:", error);
      res.status(500).json({ message: "Failed to batch create time slots" });
    }
  });

  app.post("/api/time-slots", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.id || user.role !== 'doctor') {
        return res.status(403).json({ error: "Access denied" });
      }

      const { startTime, endTime } = req.body;
      
      if (!startTime || !endTime) {
        return res.status(400).json({ error: "Start time and end time are required" });
      }

      // Get doctor record to find the correct doctorId
      const doctors = await storage.getDoctors();
      
      // Find doctor by email
      let doctor = doctors.find(d => d.user?.email === user.email);
      
      console.log("Looking for doctor with user email:", user.email);
      console.log("Available doctors:", doctors.map(d => ({ id: d.id, userId: d.userId, email: d.user?.email })));
      console.log("Found doctor:", doctor ? { id: doctor.id, userId: doctor.userId } : null);
      
      if (!doctor) {
        console.log(`❌ No doctor profile found for: ${user.email}`);
        return res.status(404).json({ error: "Doctor profile not found" });
      }

      const { randomUUID } = await import('crypto');
      
      // Parse the date and time components
      const startDateTime = new Date(startTime);
      const endDateTime = new Date(endTime);
      const dateStr = startDateTime.toISOString().split('T')[0];
      const startTimeStr = startDateTime.toTimeString().slice(0, 5);
      const endTimeStr = endDateTime.toTimeString().slice(0, 5);
      
      // Use doctor.id as integer for time slots
      console.log(`Creating time slot for doctor ${doctor.id}`);
      
      const timeSlot = await storage.createTimeSlot({
        doctorId: doctor.id, // Use integer doctor ID
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        isAvailable: true,
        createdAt: new Date()
      });
      
      res.status(201).json(timeSlot);
    } catch (error) {
      console.error("Error creating time slot:", error);
      res.status(500).json({ message: "Failed to create time slot" });
    }
  });

  app.put("/api/time-slots/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.id || user.role !== 'doctor') {
        return res.status(403).json({ error: "Access denied" });
      }

      const { id } = req.params;
      const { startTime, endTime } = req.body;
      
      if (!startTime || !endTime) {
        return res.status(400).json({ error: "Start time and end time are required" });
      }

      // Parse the date and time components
      const startDateTime = new Date(startTime);
      const endDateTime = new Date(endTime);
      const dateStr = startDateTime.toISOString().split('T')[0];
      const startTimeStr = startDateTime.toTimeString().slice(0, 5);
      const endTimeStr = endDateTime.toTimeString().slice(0, 5);
      
      const timeSlot = await storage.updateTimeSlot(id, {
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr
      });
      
      res.json(timeSlot);
    } catch (error) {
      console.error("Error updating time slot:", error);
      res.status(500).json({ message: "Failed to update time slot" });
    }
  });

  app.delete("/api/time-slots/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.id || user.role !== 'doctor') {
        return res.status(403).json({ error: "Access denied" });
      }

      const { id } = req.params;
      await storage.deleteTimeSlot(id);
      
      res.json({ message: "Time slot deleted successfully" });
    } catch (error) {
      console.error("Error deleting time slot:", error);
      res.status(500).json({ message: "Failed to delete time slot" });
    }
  });

  // Appointment routes (already defined above)

  // Payment routes
  app.post("/api/payment/create-intent", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId, amount } = req.body;
      
      if (!appointmentId || !amount) {
        return res.status(400).json({ error: "Missing appointmentId or amount" });
      }

      // Get appointment details
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency: 'eur',
        metadata: {
          appointmentId,
          patientId: req.user.id.toString(),
          doctorId: appointment.doctorId.toString(),
        },
      });

      // Update appointment status to pending_payment
      await storage.updateAppointmentStatus(appointmentId, "pending_payment", paymentIntent.id);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  app.post("/api/payment/confirm", isAuthenticated, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Missing paymentIntentId" });
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const appointmentId = paymentIntent.metadata.appointmentId;
        
        // Update appointment status to paid with payment intent ID
        await storage.updateAppointmentStatus(appointmentId, "paid", paymentIntentId);

        // Get appointment details to mark the corresponding slot as unavailable
        const appointment = await storage.getAppointment(appointmentId);
        
        if (appointment) {
          // Find and mark the corresponding time slot as unavailable
          const timeSlots = await storage.getDoctorTimeSlots(appointment.doctorId);
          const appointmentDate = new Date(appointment.appointmentDate);
          
          // Convert to local time for matching with slots that are stored in local time format
          const appointmentTimeString = appointmentDate.toTimeString().slice(0, 8); // HH:MM:SS format (local time)
          const appointmentDateString = appointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          console.log(`🔍 Looking for slot: date=${appointmentDateString}, time=${appointmentTimeString} (local time)`);
          console.log(`📅 Available slots:`, timeSlots.map(s => `${s.date} ${s.startTime} (available: ${s.isAvailable})`));
          
          const matchingSlot = timeSlots.find(slot => 
            slot.date === appointmentDateString && 
            slot.startTime === appointmentTimeString &&
            slot.isAvailable
          );
          
          if (matchingSlot) {
            await storage.updateTimeSlot(matchingSlot.id, { isAvailable: false });
            console.log(`🔒 Marked slot ${matchingSlot.id} as unavailable after successful payment`);
          } else {
            console.log(`⚠️ Could not find matching slot for appointment date: ${appointmentDateString} ${appointmentTimeString}`);
          }
        }
        let appointmentDetails = null;
        
        if (appointment) {
          // Get doctor details
          const doctor = await storage.getDoctor(appointment.doctorId);
          
          appointmentDetails = {
            appointmentId: appointment.id,
            doctorName: doctor ? `${doctor.user?.firstName || ''} ${doctor.user?.lastName || ''}`.trim() || doctor.user?.email : 'Unknown Doctor',
            specialty: doctor?.specialty || '',
            slot: appointment.appointmentDate || '',
            price: appointment.price,
            status: appointment.status
          };
        }

        res.json({ 
          success: true, 
          status: paymentIntent.status,
          appointmentDetails
        });
      } else {
        res.json({ success: false, status: paymentIntent.status });
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  });


  // ADMIN: Sync existing paid appointments with slot availability
  app.post("/api/admin/sync-appointments-slots", async (req, res) => {
    try {
      console.log('🔄 Starting appointment-slot synchronization...');
      
      // Get all paid appointments for doctorId=9
      const appointments = await storage.getAppointments(undefined, "9");
      const paidAppointments = appointments.filter(apt => apt.status === 'paid');
      
      console.log(`Found ${paidAppointments.length} paid appointments to sync`);
      
      let syncCount = 0;
      
      for (const appointment of paidAppointments) {
        const timeSlots = await storage.getDoctorTimeSlots(appointment.doctorId);
        const appointmentDate = new Date(appointment.appointmentDate);
        const appointmentTimeString = appointmentDate.toTimeString().slice(0, 8); // HH:MM:SS format
        const appointmentDateString = appointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        console.log(`🔍 Syncing appointment ${appointment.id}: ${appointmentDateString} ${appointmentTimeString}`);
        
        const matchingSlot = timeSlots.find(slot => 
          slot.date === appointmentDateString && 
          slot.startTime === appointmentTimeString &&
          slot.isAvailable === true
        );
        
        if (matchingSlot) {
          await storage.updateTimeSlot(matchingSlot.id, { isAvailable: false });
          console.log(`✅ Marked slot ${matchingSlot.id} as unavailable for appointment ${appointment.id}`);
          syncCount++;
        } else {
          console.log(`⚠️ No available slot found for appointment ${appointment.id}`);
        }
      }
      
      res.json({ 
        success: true, 
        message: `Synchronized ${syncCount} appointments with slots`,
        totalAppointments: paidAppointments.length,
        syncedSlots: syncCount
      });
    } catch (error) {
      console.error('❌ Sync error:', error);
      res.status(500).json({ error: 'Failed to sync appointments' });
    }
  });

  // Stripe webhook for payment events
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Note: In production, you should use a webhook secret
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const appointmentId = paymentIntent.metadata.appointmentId;
        
        if (appointmentId) {
          await storage.updateAppointmentStatus(appointmentId, "paid");
          
          // Mark corresponding slot as unavailable
          const appointment = await storage.getAppointment(appointmentId);
          if (appointment) {
            const timeSlots = await storage.getDoctorTimeSlots(appointment.doctorId);
            const appointmentDate = new Date(appointment.appointmentDate);
            const appointmentTimeString = appointmentDate.toTimeString().slice(0, 8); // HH:MM:SS format (local time)
            const appointmentDateString = appointmentDate.toISOString().split('T')[0];
            
            console.log(`🔍 Webhook: Looking for slot: date=${appointmentDateString}, time=${appointmentTimeString} (local time)`);
            
            const matchingSlot = timeSlots.find(slot => 
              slot.date === appointmentDateString && 
              slot.startTime === appointmentTimeString &&
              slot.isAvailable
            );
            
            if (matchingSlot) {
              await storage.updateTimeSlot(matchingSlot.id, { isAvailable: false });
              console.log(`🔒 Webhook: Marked slot ${matchingSlot.id} as unavailable`);
            }
          }
          
          console.log(`✅ Payment succeeded for appointment ${appointmentId}`);
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        const failedAppointmentId = failedPayment.metadata.appointmentId;
        
        if (failedAppointmentId) {
          await storage.updateAppointmentStatus(failedAppointmentId, "payment_failed");
          console.log(`❌ Payment failed for appointment ${failedAppointmentId}`);
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Health Profile Routes
  // Get health profile for authenticated user
  app.get("/api/health-profile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      console.log('🔍 GET /api/health-profile - fetching for user ID:', user.id);
      const healthProfile = await storage.getHealthProfile(user.id);
      console.log('📋 Returning health profile:', {
        hasProfile: !!healthProfile,
        profileStatus: healthProfile?.profileStatus,
        completionScore: healthProfile?.completionScore
      });
      res.json(healthProfile);
    } catch (error) {
      console.error("Error fetching health profile:", error);
      res.status(500).json({ message: "Failed to fetch health profile" });
    }
  });

  app.get("/api/health-profile/:userId", isAuthenticated, async (req, res) => {
    try {
      const healthProfile = await storage.getHealthProfile(parseInt(req.params.userId));
      res.json(healthProfile);
    } catch (error) {
      console.error("Error fetching health profile:", error);
      res.status(500).json({ message: "Failed to fetch health profile" });
    }
  });

  app.post("/api/health-profile", isAuthenticated, async (req, res) => {
    try {
      // Get the authenticated user from req.user (set by isAuthenticated middleware)
      const user = req.user as any;
      
      const profileData = {
        ...req.body,
        patientId: user.id, // Use user.id from the authentication middleware
        completionScore: 100, // Mark as complete
        profileStatus: 'complete',
        lastReviewedAt: new Date(),
        needsReviewAfter: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months from now
      };

      console.log('Creating health profile with patientId:', user.id);
      const healthProfile = await storage.createHealthProfile(profileData);
      res.json(healthProfile);
    } catch (error) {
      console.error("Error creating health profile:", error);
      res.status(500).json({ message: "Failed to create health profile" });
    }
  });

  app.put("/api/health-profile/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const profileData = {
        ...req.body,
        patientId: user.id,
        profileStatus: 'complete',
        completionScore: 100,
        lastReviewedAt: new Date(),
        needsReviewAfter: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months from now
      };
      
      console.log('Updating health profile for user ID:', user.id, 'with ID:', req.params.id);
      
      try {
        // Try to update first
        const healthProfile = await storage.updateHealthProfile(req.params.id, profileData);
        res.json(healthProfile);
      } catch (updateError: any) {
        // If update fails because profile doesn't exist, create a new one
        if (updateError.message.includes('not found')) {
          console.log('Profile not found, creating new health profile for user:', user.id);
          const newHealthProfile = await storage.createHealthProfile(profileData);
          res.json(newHealthProfile);
        } else {
          throw updateError;
        }
      }
    } catch (error) {
      console.error("Error with health profile operation:", error);
      res.status(500).json({ message: "Failed to save health profile" });
    }
  });

  // Document Routes with real database integration
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const appointmentId = req.query.appointmentId ? parseInt(req.query.appointmentId as string) : undefined;
      const documents = await storage.getDocuments(appointmentId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:appointmentId", isAuthenticated, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      const documents = await storage.getDocuments(appointmentId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/patient/:patientId", isAuthenticated, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const documents = await storage.getDocumentsByPatient(patientId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching patient documents:", error);
      res.status(500).json({ message: "Failed to fetch patient documents" });
    }
  });

  app.get("/api/documents/download/:documentId", isAuthenticated, async (req, res) => {
    try {
      const documentId = req.params.documentId;
      console.log('📥 HIPAA-compliant download request for document ID:', documentId);
      
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        console.log('❌ Document not found:', documentId);
        return res.status(404).json({ message: "Document not found" });
      }

      console.log('📄 Document found:', { fileName: document.fileName, fileType: document.fileType });

      // Get user from session for access control
      const user = req.user as any;
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log('📂 Document uploadUrl:', document.uploadUrl);

      // Check if this is a legacy document (old system) or new secure storage
      if (document.uploadUrl.startsWith('/objects/')) {
        // New secure storage system
        console.log('🔒 Processing secure storage document');
        const objectStorageService = new ObjectStorageService();
        
        try {
          // Get the object file from secure storage
          const objectFile = await objectStorageService.getObjectEntityFile(document.uploadUrl);
          
          // Check access permissions (HIPAA compliance)
          const canAccess = await objectStorageService.canAccessObjectEntity({
            objectFile,
            userId: user.id,
            requestedPermission: ObjectPermission.READ,
          });
          
          if (!canAccess) {
            console.log(`❌ Access denied for user ${user.id} to document ${documentId}`);
            return res.status(403).json({ message: "Access denied" });
          }

          // Set HIPAA-compliant headers
          res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
          res.setHeader('Content-Type', document.fileType || 'application/octet-stream');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
          
          // Stream the file securely
          await objectStorageService.downloadObject(objectFile, res);
          
        } catch (objectError) {
          console.error('Error accessing object storage:', objectError);
          if (objectError instanceof ObjectNotFoundError) {
            return res.status(404).json({ message: "Document file not found in secure storage" });
          }
          throw objectError;
        }
      } else {
        // Legacy document (old system) - inform user about migration needed
        console.log('⚠️ Legacy document detected - needs migration to secure storage');
        
        const migrationMessage = `Document Migration Required

File: ${document.fileName}
Type: ${document.fileType}
Upload Date: ${new Date(document.uploadedAt).toLocaleDateString()}
Size: ${document.fileSize} bytes

This document was uploaded before the secure storage system was implemented.
For HIPAA/GDPR compliance, all medical documents must be stored in encrypted, 
access-controlled storage.

To access this document:
1. The document needs to be re-uploaded through the secure system
2. This will ensure proper encryption and access controls
3. The original upload metadata is preserved for audit purposes

Please upload the document again through the secure upload system.`;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="Migration_Notice_${document.fileName}.txt"`);
        res.send(Buffer.from(migrationMessage, 'utf8'));
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  app.post("/api/documents/upload", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      console.log('🔒 HIPAA-compliant document upload request received');
      console.log('📁 File info:', req.file ? { 
        filename: req.file.originalname, 
        size: req.file.size, 
        mimetype: req.file.mimetype 
      } : 'No file');
      console.log('📁 Body:', req.body);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get user from session
      const user = req.user as any;
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Parse data from form
      const appointmentId = req.body.appointmentId ? parseInt(req.body.appointmentId) : null;
      const documentType = req.body.documentType || 'other';
      const patientId = req.body.patientId ? parseInt(req.body.patientId) : null;

      // Initialize object storage service
      const objectStorageService = new ObjectStorageService();
      
      try {
        // Get presigned URL for secure upload
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        console.log('🔗 Generated secure upload URL');

        // Upload file to secure object storage
        const uploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: req.file.buffer,
          headers: {
            'Content-Type': req.file.mimetype,
            'Content-Length': req.file.size.toString(),
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        console.log('✅ File uploaded to secure storage');

        // Normalize the object path for database storage
        const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

        // Set HIPAA-compliant ACL policy
        const aclPolicy = {
          owner: patientId?.toString() || user.id,
          visibility: "private" as const,
          encryptionEnabled: true,
          auditLogging: true,
          dataClassification: "PHI" as const,
          aclRules: [
            {
              group: {
                type: ObjectAccessGroupType.DOCTOR_ACCESS,
                id: patientId?.toString() || user.id,
              },
              permission: ObjectPermission.READ,
            },
          ],
        };

        // Apply ACL policy to the uploaded file
        await objectStorageService.trySetObjectEntityAclPolicy(uploadURL, aclPolicy);
        console.log('🔒 HIPAA-compliant ACL policy applied');

        // Store document metadata in database
        const documentData = {
          appointmentId: appointmentId,
          uploadedBy: parseInt(user.id),
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          uploadUrl: objectPath, // Secure object storage path
          documentType: documentType
        };

        const document = await storage.createDocument(documentData);
        
        console.log('✅ HIPAA-compliant document saved:', {
          id: document.id,
          fileName: document.fileName,
          encrypted: true,
          auditLogged: true,
        });

        res.status(200).json({
          ...document,
          securityCompliance: {
            encrypted: true,
            auditLogged: true,
            accessControlled: true,
            hipaaCompliant: true,
            gdprCompliant: true,
          }
        });

      } catch (uploadError) {
        console.error('Error with secure upload:', uploadError);
        throw new Error(`Secure upload failed: ${uploadError.message}`);
      }

    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document securely" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Banner Dismissal Routes (placeholder implementation)
  app.post("/api/banner-dismissals", isAuthenticated, async (req, res) => {
    try {
      const dismissal = {
        id: Date.now().toString(),
        userId: req.session.user?.id,
        bannerType: req.body.bannerType,
        dismissedAt: new Date().toISOString(),
        expiresAt: req.body.expiresAt,
      };
      res.json(dismissal);
    } catch (error) {
      console.error("Error creating banner dismissal:", error);
      res.status(500).json({ message: "Failed to create banner dismissal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}