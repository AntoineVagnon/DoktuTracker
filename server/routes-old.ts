import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupSupabaseAuth, isAuthenticated } from "./supabaseAuth";
import { insertDoctorSchema, insertTimeSlotSchema, insertAppointmentSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupSupabaseAuth(app);

  // Test callback endpoint for OAuth troubleshooting
  app.get('/test-callback', (req, res) => {
    res.send('✅ Callback received with query: ' + JSON.stringify(req.query));
  });

  // Note: Auth routes are now handled by setupSupabaseAuth

  // Legacy Replit Auth endpoints are now removed - using Supabase Auth instead

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Create new user
      const newUser = await storage.createUser({
        firstName: firstName,
        lastName: lastName,
        email: email,
        role: 'patient',
        // Note: In a real app, you'd hash the password
        // For now, we'll store it as-is (not recommended for production)
      });

      // Create session
      req.session.user = {
        id: newUser.id,
        email: newUser.email || '',
        firstName: newUser.firstName || '',
        lastName: newUser.lastName || '',
      };

      res.json({ success: true, user: newUser });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Note: In a real app, you'd verify the hashed password
      // For now, we'll assume the login is successful

      // Create session
      req.session.user = {
        id: user.id,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      };

      res.json({ success: true, user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Patient login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // TODO: Implement patient authentication logic
      // For now, return a placeholder response
      res.status(501).json({ message: "Patient authentication not yet implemented" });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Patient registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // TODO: Implement patient registration logic
      // For now, return a placeholder response
      res.status(501).json({ message: "Patient registration not yet implemented" });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Doctor routes
  app.get("/api/doctors", async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  // Public doctors grid endpoint
  app.get("/api/public/doctors-grid", async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      
      // Get next 2 available slots for each doctor
      const doctorsGrid = await Promise.all(doctors.slice(0, 10).map(async (doctor) => {
        const timeSlots = await storage.getDoctorTimeSlots(doctor.id);
        const nextAvailableSlots = timeSlots
          .filter(slot => slot.isAvailable && new Date(slot.date + 'T' + slot.startTime) > new Date())
          .slice(0, 2)
          .map(slot => new Date(slot.date + 'T' + slot.startTime).toISOString());
        
        return {
          id: doctor.id,
          firstName: doctor.user.firstName,
          lastName: doctor.user.lastName,
          specialty: doctor.specialty,
          avatarUrl: doctor.user.profileImageUrl,
          avgRating: doctor.rating ? parseFloat(doctor.rating) : null,
          nextAvailableSlots
        };
      }));
      
      res.json(doctorsGrid);
    } catch (error) {
      console.error("Error fetching doctors grid:", error);
      res.status(500).json({ message: "Failed to fetch doctors grid" });
    }
  });

  // Public doctor detail endpoint
  app.get("/api/public/doctors/:id", async (req, res) => {
    try {
      const doctor = await storage.getDoctor(req.params.id);
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }

      // Get all future availability for this doctor
      const timeSlots = await storage.getDoctorTimeSlots(doctor.id);
      const availableSlots = timeSlots
        .filter(slot => slot.isAvailable && new Date(slot.date + 'T' + slot.startTime) > new Date())
        .map(slot => ({
          id: slot.id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable
        }));
      
      const doctorDetail = {
        id: doctor.id,
        specialty: doctor.specialty,
        avg_rating: parseFloat(doctor.rating || '0'),
        review_count: doctor.reviewCount || 0,
        avatar_url: doctor.user?.profileImageUrl,
        location: "Paris, France",
        rpps_number: doctor.rppsNumber,
        consultation_price: doctor.consultationPrice,
        is_online: doctor.isOnline,
        user: {
          firstName: doctor.user?.firstName,
          lastName: doctor.user?.lastName,
          bio: doctor.bio
        },
        education: doctor.education,
        experience: doctor.experience,
        languages: doctor.languages || [],
        availability: availableSlots.map(slot => `${slot.date}T${slot.startTime}:00Z`)
      };

      res.json(doctorDetail);
    } catch (error) {
      console.error("Error fetching doctor detail:", error);
      res.status(500).json({ message: "Failed to fetch doctor details" });
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

  app.post("/api/doctors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const doctorData = insertDoctorSchema.parse({ ...req.body, userId });
      const doctor = await storage.createDoctor(doctorData);

      // Update user role to doctor
      await storage.upsertUser({ id: userId, role: "doctor" });

      res.json(doctor);
    } catch (error) {
      console.error("Error creating doctor:", error);
      res.status(500).json({ message: "Failed to create doctor profile" });
    }
  });

  // Time slot routes
  app.get("/api/doctors/:id/time-slots", async (req, res) => {
    try {
      const { date } = req.query;
      const slots = await storage.getDoctorTimeSlots(req.params.id, date as string);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      res.status(500).json({ message: "Failed to fetch time slots" });
    }
  });

  app.post("/api/doctors/:id/time-slots", isAuthenticated, async (req: any, res) => {
    try {
      const slotData = insertTimeSlotSchema.parse({ ...req.body, doctorId: req.params.id });
      const slot = await storage.createTimeSlot(slotData);
      res.json(slot);
    } catch (error) {
      console.error("Error creating time slot:", error);
      res.status(500).json({ message: "Failed to create time slot" });
    }
  });

  app.delete("/api/time-slots/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTimeSlot(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting time slot:", error);
      res.status(500).json({ message: "Failed to delete time slot" });
    }
  });

  app.post("/api/time-slots/:id/lock", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.lockTimeSlot(req.params.id, userId, 15); // Lock for 15 minutes
      res.json({ success: true });
    } catch (error) {
      console.error("Error locking time slot:", error);
      res.status(500).json({ message: "Failed to lock time slot" });
    }
  });

  // Appointment routes
  app.get("/api/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      let appointments;
      if (user?.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(userId);
        appointments = await storage.getAppointments(undefined, doctor?.id);
      } else {
        appointments = await storage.getAppointments(userId);
      }

      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const appointmentData = insertAppointmentSchema.parse({ ...req.body, patientId: userId });
      const appointment = await storage.createAppointment(appointmentData);
      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.patch("/api/appointments/:id/reschedule", isAuthenticated, async (req, res) => {
    try {
      const { newSlotId, reason } = req.body;
      await storage.rescheduleAppointment(req.params.id, newSlotId, reason);
      res.json({ success: true });
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      res.status(500).json({ message: "Failed to reschedule appointment" });
    }
  });

  app.patch("/api/appointments/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const { reason } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const cancelledBy = user?.role || "patient";

      await storage.cancelAppointment(req.params.id, cancelledBy, reason);
      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ message: "Failed to cancel appointment" });
    }
  });

  // Payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, doctorId, slot, appointmentId } = req.body;
      
      // Check if user is authenticated (either through Replit Auth or custom auth)
      const isAuthenticated = req.isAuthenticated() || req.session?.user;
      
      if (!isAuthenticated) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "eur",
        metadata: { 
          appointmentId: appointmentId || '',
          doctorId: doctorId || '',
          slot: slot || '',
          type: 'consultation'
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post("/api/confirm-payment", isAuthenticated, async (req, res) => {
    try {
      const { paymentIntentId, appointmentId } = req.body;

      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === "succeeded") {
        await storage.updateAppointmentPayment(appointmentId, paymentIntentId);
        res.json({ success: true });
      } else {
        res.status(400).json({ message: "Payment not confirmed" });
      }
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Error confirming payment: " + error.message });
    }
  });

  // Review routes
  app.post("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reviewData = insertReviewSchema.parse({ ...req.body, patientId: userId });
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get("/api/doctors/:id/reviews", async (req, res) => {
    try {
      const reviews = await storage.getDoctorReviews(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Admin routes
  app.get("/api/admin/kpis", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const kpis = await storage.getKPIs();
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  // Admin: Create doctor account
  app.post("/api/admin/create-doctor", isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.claims.sub);
      if (adminUser?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { email, firstName, lastName, specialty, bio, education, experience, languages, rppsNumber, consultationPrice } = req.body;

      if (!email || !firstName || !lastName || !specialty) {
        return res.status(400).json({ message: "Email, first name, last name, and specialty are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Create user account
      const doctorUser = await storage.createUser({
        firstName,
        lastName,
        email,
        role: 'doctor'
      });

      // Create doctor profile
      const doctorData = {
        userId: doctorUser.id,
        specialty,
        bio: bio || '',
        education: education || '',
        experience: experience || '',
        languages: languages || [],
        rppsNumber: rppsNumber || '',
        consultationPrice: consultationPrice || '35.00'
      };

      const doctor = await storage.createDoctor(doctorData);

      res.json({ 
        success: true, 
        message: "Doctor account created successfully",
        doctor: {
          id: doctor.id,
          email: doctorUser.email,
          firstName: doctorUser.firstName,
          lastName: doctorUser.lastName,
          specialty: doctor.specialty
        }
      });
    } catch (error) {
      console.error("Error creating doctor:", error);
      res.status(500).json({ message: "Failed to create doctor account" });
    }
  });

  // Admin: Create admin account
  app.post("/api/admin/create-admin", isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.claims.sub);
      if (adminUser?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { email, firstName, lastName } = req.body;

      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Create admin account
      const newAdmin = await storage.createUser({
        firstName,
        lastName,
        email,
        role: 'admin'
      });

      res.json({ 
        success: true, 
        message: "Admin account created successfully",
        admin: {
          id: newAdmin.id,
          email: newAdmin.email,
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          role: newAdmin.role
        }
      });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.claims.sub);
      if (adminUser?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Cron job to unlock expired slots
  setInterval(async () => {
    try {
      await storage.unlockExpiredSlots();
    } catch (error) {
      console.error("Error unlocking expired slots:", error);
    }
  }, 60000); // Run every minute

  const httpServer = createServer(app);
  return httpServer;
}