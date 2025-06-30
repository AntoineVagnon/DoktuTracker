import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
      // Return up to 10 doctors for the grid
      const doctorsGrid = doctors.slice(0, 10).map(doctor => ({
        id: doctor.id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        specialty: doctor.specialty,
        avatarUrl: doctor.avatarUrl,
        avgRating: doctor.avgRating,
        // Add placeholder availability for now
        nextAvailableSlots: [
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        ]
      }));
      res.json(doctorsGrid);
    } catch (error) {
      console.error("Error fetching doctors grid:", error);
      res.status(500).json({ message: "Failed to fetch doctors grid" });
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
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      const { amount, appointmentId } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "eur",
        metadata: { appointmentId },
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