import type { Express } from "express";
import { createServer, type Server } from "http";

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
      console.log(`🔍 Fetching slots for doctor ID: ${doctorId}, date: ${date}`);
      const slots = await storage.getDoctorTimeSlots(doctorId, date as string);
      console.log(`📅 Found ${slots.length} slots for doctor ${doctorId}`);
      res.json(slots);
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
        // For doctors, get doctor record and fetch appointments by doctorId
        const doctors = await storage.getDoctors();
        // Find doctor by email since userId is a UUID string in Supabase
        const doctor = doctors.find(d => d.user?.email === user.email);
        
        if (!doctor) {
          console.log("Available doctors:", doctors.map(d => ({ id: d.id, userId: d.userId, email: d.user?.email })));
          console.log("Looking for doctor with email:", user.email);
          
          // Auto-create doctor profile for authenticated doctor
          try {
            const newDoctor = await storage.createDoctor({
              userId: 7, // Use fallback user ID for test doctor
              specialty: "General Practice",
              bio: "New doctor on Doktu platform",
              education: "Medical degree",
              experience: "General practice experience",
              languages: ["English", "French"],
              consultationPrice: "3.00",
              rating: 0,
              reviewCount: 0
            });
            appointments = await storage.getAppointments(undefined, newDoctor.id);
          } catch (createError) {
            console.error("Error creating doctor profile:", createError);
            return res.status(404).json({ error: "Doctor profile not found and could not be created" });
          }
        } else {
          appointments = await storage.getAppointments(undefined, doctor.id);
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
      
      // For testing purposes, if this is the test doctor email, use the first doctor
      let doctor = doctors.find(d => d.user?.email === user.email);
      if (!doctor && user.email === "james.rodriguez@doktu.com") {
        doctor = doctors.find(d => d.user?.email === "james.rodriguez@doku.com");
      }
      
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
      
      // For testing purposes, match both email variations 
      let doctor = doctors.find(d => 
        d.user?.email === user.email || 
        (user.email === "james.rodriguez@doktu.com" && d.user?.email === "james.rodriguez@doku.com")
      );
      
      console.log("Looking for doctor with user email:", user.email);
      console.log("Available doctors:", doctors.map(d => ({ id: d.id, userId: d.userId, email: d.user?.email })));
      console.log("Found doctor:", doctor ? { id: doctor.id, userId: doctor.userId } : null);
      
      if (!doctor) {
        console.log("No doctor profile found for:", user.email);
        console.log("Auto-creating doctor profile...");
        
        // Auto-create doctor profile for authenticated doctor
        try {
          const doctorData = {
            userId: parseInt(user.id) || 7, // Convert UUID to user integer ID or use fallback
            specialty: "General Practice",
            bio: "New doctor on Doktu platform",
            education: "Medical degree",
            experience: "General practice experience",
            languages: ["English", "French"],
            consultationPrice: "3.00",
            rating: 0,
            reviewCount: 0
          };
          
          console.log("Creating doctor with data:", doctorData);
          doctor = await storage.createDoctor(doctorData);
          console.log("Successfully created doctor profile:", { id: doctor.id, userId: doctor.userId });
        } catch (createError) {
          console.error("Error creating doctor profile:", createError);
          return res.status(404).json({ error: "Doctor profile not found and could not be created" });
        }
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
        
        // Update appointment status to paid
        await storage.updateAppointmentStatus(appointmentId, "paid");
        
        // Record the payment
        await storage.recordPayment({
          appointmentId,
          patientId: req.user.id.toString(),
          stripePaymentIntentId: paymentIntentId,
          amount: (paymentIntent.amount / 100).toString(),
          currency: paymentIntent.currency.toUpperCase(),
          status: "succeeded",
          paymentMethod: "card",
        });

        // Get appointment details for response
        const appointment = await storage.getAppointment(appointmentId);
        let appointmentDetails = null;
        
        if (appointment) {
          // Get doctor details
          const doctor = await storage.getDoctor(appointment.doctorId);
          // Get time slot details  
          const timeSlot = await storage.getTimeSlot(appointment.timeSlotId);
          
          appointmentDetails = {
            appointmentId: appointment.id,
            doctorName: doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Unknown Doctor',
            specialty: doctor?.specialty || '',
            slot: timeSlot ? `${timeSlot.date}T${timeSlot.startTime}:00` : '',
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

  const httpServer = createServer(app);
  return httpServer;
}