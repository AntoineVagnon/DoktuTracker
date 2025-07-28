import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupSupabaseAuth, isAuthenticated, supabase } from "./supabaseAuth";
import { insertDoctorSchema, insertTimeSlotSchema, insertAppointmentSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Supabase authentication
  await setupSupabaseAuth(app);

  // Test callback endpoint for OAuth troubleshooting
  app.get('/test-callback', (req, res) => {
    res.send('✅ Callback received with query: ' + JSON.stringify(req.query));
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
      const { date } = req.query;
      const slots = await storage.getDoctorTimeSlots(doctorId, date as string);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching slots:", error);
      res.status(500).json({ message: "Failed to fetch slots" });
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

      const appointments = await storage.getAppointments(userId);
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
        ...req.body,
        patientId: userId,
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

  // Slot holding routes for booking flow
  app.post('/api/slots/hold', async (req, res) => {
    try {
      const { slotId, sessionId } = z.object({
        slotId: z.string(),
        sessionId: z.string().optional(),
      }).parse(req.body);
      
      const actualSessionId = sessionId || req.session.id;
      
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

  const httpServer = createServer(app);
  return httpServer;
}