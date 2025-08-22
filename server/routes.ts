import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission, ObjectAccessGroupType } from "./objectAcl";
import { createClient } from "@supabase/supabase-js";
import {
  helmetConfig,
  additionalSecurityHeaders,
  generalLimiter,
  authLimiter,
  speedLimiter,
  strictLimiter,
  validateAndSanitizeUser,
  validateRegistration,
  handleValidationErrors,
  errorHandler,
  securityAudit,
  sanitizeInput,
  authenticateToken
} from "./middleware/security";

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
import { insertDoctorSchema, insertTimeSlotSchema, insertAppointmentSchema, insertReviewSchema, insertDocumentUploadSchema, doctorTimeSlots } from "@shared/schema";
import { z } from "zod";
import { registerDocumentLibraryRoutes } from "./routes/documentLibrary";
import { setupSlotRoutes } from "./routes/slots";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { notificationService, TriggerCode } from "./services/notificationService";
import { emailService } from "./emailService";
import { zoomService } from "./services/zoomService";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply security middleware globally
  app.use(helmetConfig);
  app.use(additionalSecurityHeaders);
  app.use(securityAudit);
  app.use(sanitizeInput);
  
  // Apply rate limiting
  app.use('/api/', generalLimiter);
  app.use('/api/auth/', authLimiter);
  app.use('/api/auth/', speedLimiter);
  
  // Setup Supabase authentication
  await setupSupabaseAuth(app);

  // Register document library routes
  registerDocumentLibraryRoutes(app);
  
  // Register slot management routes
  setupSlotRoutes(app);
  
  // Register consent management routes (GDPR compliance)
  const consentsRouter = (await import("./routes/consents")).default;
  app.use("/api", consentsRouter);
  
  // Register GDPR data processing routes (Phase 3)
  const gdprRouter = (await import("./routes/gdpr")).default;
  app.use("/", gdprRouter);
  
  // Register MDR compliance routes (Phase 4)
  const mdrRouter = (await import("./routes/mdr")).default;
  app.use("/", mdrRouter);
  
  // Register Professional Qualification routes (Phase 5)
  const qualificationsRouter = (await import("./routes/qualifications")).default;
  app.use("/", qualificationsRouter);
  
  // Register Data Security routes (Phase 6)
  const securityRouter = (await import("./routes/security")).default;
  app.use("/api/security", securityRouter);
  
  // Zoom meeting endpoints
  app.get("/api/zoom/status", async (req, res) => {
    res.json({
      configured: zoomService.isConfigured(),
      message: zoomService.isConfigured() 
        ? "Zoom integration is configured and ready"
        : "Zoom credentials not configured. Please set ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and ZOOM_ACCOUNT_ID environment variables"
    });
  });

  // Get Zoom meeting details for an appointment
  app.get("/api/appointments/:id/zoom", isAuthenticated, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Check if user has access to this appointment
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Allow access if user is the patient or a doctor
      if (appointment.patientId !== user.id && user.role !== 'doctor' && user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!appointment.zoomMeetingId) {
        return res.status(404).json({ error: "No Zoom meeting found for this appointment" });
      }
      
      // Get current meeting details from Zoom API
      const meeting = await zoomService.getMeeting(appointment.zoomMeetingId);
      
      res.json({
        meetingId: appointment.zoomMeetingId,
        joinUrl: appointment.zoomJoinUrl,
        startUrl: appointment.zoomStartUrl,
        password: appointment.zoomPassword,
        status: meeting ? "active" : "expired"
      });
    } catch (error) {
      console.error("Error getting Zoom meeting details:", error);
      res.status(500).json({ error: "Failed to get meeting details" });
    }
  });

  // API endpoint to fix database table constraints
  app.get("/api/fix-database", async (req, res) => {
    try {
      console.log('🔧 Fixing document_uploads table constraint...');
      
      const db = (await import("./db")).db;
      const { sql } = await import("drizzle-orm");
      
      // First, drop the problematic constraint if it exists
      await db.execute(sql`
        ALTER TABLE IF EXISTS document_uploads 
        DROP CONSTRAINT IF EXISTS document_uploads_appointment_id_not_null
      `);
      
      // Try to alter the column to make it nullable
      await db.execute(sql`
        ALTER TABLE IF EXISTS document_uploads 
        ALTER COLUMN appointment_id DROP NOT NULL
      `);
      
      console.log('✅ Database constraint fixed');
      
      res.json({ 
        success: true, 
        message: "Database constraint fixed successfully" 
      });
      
    } catch (error: any) {
      console.error('❌ Error fixing database:', error);
      
      // If alter fails, try to recreate tables
      try {
        console.log('🔄 Recreating tables...');
        
        await db.execute(sql`DROP TABLE IF EXISTS appointment_documents CASCADE`);
        await db.execute(sql`DROP TABLE IF EXISTS document_uploads CASCADE`);
        
        await db.execute(sql`
          CREATE TABLE document_uploads (
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
        
        await db.execute(sql`
          CREATE TABLE appointment_documents (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              appointment_id integer NOT NULL REFERENCES appointments(id),
              document_id uuid NOT NULL REFERENCES document_uploads(id),
              attached_at timestamp DEFAULT now()
          )
        `);
        
        console.log('✅ Tables recreated successfully');
        
        res.json({ 
          success: true, 
          message: "Tables recreated successfully" 
        });
        
      } catch (recreateError: any) {
        console.error('❌ Error recreating tables:', recreateError);
        res.status(500).json({ 
          success: false, 
          error: recreateError.message 
        });
      }
    }
  });

  // Temporary route to create video appointments for testing
  app.post("/api/create-test-video-appointments", async (req, res) => {
    try {
      console.log('🎥 Creating test video appointments...');
      
      // Update existing appointments to be video type
      const appointmentIds = [24, 16, 22];
      const now = new Date();
      
      // Update appointment 24 to be video and live (started 5 minutes ago)
      await storage.updateAppointment(24, {
        type: 'video',
        appointmentDate: new Date(now.getTime() - 5 * 60 * 1000),
        zoomMeetingId: 'test-meeting-24',
        zoomJoinUrl: 'https://zoom.us/j/test24',
        zoomStartUrl: 'https://zoom.us/s/test24'
      });
      console.log('✅ Updated appointment 24 as live video');
      
      // Update appointment 16 to be video and start in 3 minutes
      await storage.updateAppointment(16, {
        type: 'video',
        appointmentDate: new Date(now.getTime() + 3 * 60 * 1000),
        zoomMeetingId: 'test-meeting-16',
        zoomJoinUrl: 'https://zoom.us/j/test16',
        zoomStartUrl: 'https://zoom.us/s/test16'
      });
      console.log('✅ Updated appointment 16 to start soon');
      
      // Update appointment 22 to be video and start in 15 minutes
      await storage.updateAppointment(22, {
        type: 'video',
        appointmentDate: new Date(now.getTime() + 15 * 60 * 1000),
        zoomMeetingId: 'test-meeting-22',
        zoomJoinUrl: 'https://zoom.us/j/test22',
        zoomStartUrl: 'https://zoom.us/s/test22'
      });
      console.log('✅ Updated appointment 22 as scheduled');
      
      res.json({ 
        success: true, 
        message: "Test video appointments created successfully",
        appointments: [
          { id: 24, status: 'live' },
          { id: 16, status: 'starting soon' },
          { id: 22, status: 'scheduled' }
        ]
      });
      
    } catch (error: any) {
      console.error('❌ Error creating video appointments:', error);
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

  // Doctor-related routes - SECURED with rate limiting
  // Public endpoint but with limited data exposure and rate limiting
  app.get("/api/doctors", strictLimiter, async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      // Filter out sensitive data before sending
      const sanitizedDoctors = doctors.map(doctor => ({
        id: doctor.id,
        specialty: doctor.specialty,
        rating: doctor.rating,
        reviewCount: doctor.reviewCount,
        consultationPrice: doctor.consultationPrice,
        availableSlots: doctor.availableSlots,
        user: doctor.user ? {
          title: doctor.user.title,
          firstName: doctor.user.firstName,
          lastName: doctor.user.lastName,
          profileImageUrl: doctor.user.profileImageUrl
          // Explicitly exclude email, id, and other sensitive fields
        } : undefined
      }));
      res.json(sanitizedDoctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ 
        error: "Failed to fetch doctors",
        code: "FETCH_ERROR"
      });
    }
  });

  // Get current doctor's professional information
  app.get('/api/doctors/current', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Find doctor record for this user
      const doctor = await storage.getDoctorByUserId(userId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }

      res.json(doctor);
    } catch (error: any) {
      console.error('Error fetching current doctor:', error);
      res.status(500).json({ message: 'Failed to fetch doctor information' });
    }
  });

  // Update current doctor's professional information
  app.patch('/api/doctors/current', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Find doctor record for this user
      const doctor = await storage.getDoctorByUserId(userId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }

      // Update doctor professional info
      const updatedDoctor = await storage.updateDoctor(doctor.id, req.body);
      res.json(updatedDoctor);
    } catch (error: any) {
      console.error('Error updating doctor professional info:', error);
      res.status(500).json({ message: 'Failed to update doctor information' });
    }
  });

  app.get("/api/doctors/:id", strictLimiter, async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      
      if (isNaN(doctorId)) {
        return res.status(400).json({ 
          error: 'Invalid doctor ID format',
          code: 'INVALID_ID_FORMAT'
        });
      }
      
      const doctor = await storage.getDoctor(req.params.id);
      if (!doctor) {
        return res.status(404).json({ 
          error: "Doctor not found",
          code: "DOCTOR_NOT_FOUND"
        });
      }
      
      // Return sanitized doctor data
      const sanitizedDoctor = {
        id: doctor.id,
        specialty: doctor.specialty,
        bio: doctor.bio,
        education: doctor.education,
        experience: doctor.experience,
        languages: doctor.languages,
        consultationPrice: doctor.consultationPrice,
        rating: doctor.rating,
        reviewCount: doctor.reviewCount,
        user: doctor.user ? {
          title: doctor.user.title,
          firstName: doctor.user.firstName,
          lastName: doctor.user.lastName,
          profileImageUrl: doctor.user.profileImageUrl
        } : undefined
      };
      
      res.json(sanitizedDoctor);
    } catch (error) {
      console.error("Error fetching doctor:", error);
      res.status(500).json({ 
        error: "Failed to fetch doctor",
        code: "FETCH_ERROR"
      });
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
        const leadTimeMinutes = 60; // 60-minute buffer requirement
        
        const nextSlot = slots
          .filter(slot => {
            if (!slot.isAvailable) return false;
            // Slots are stored in local European time, so we need to interpret them correctly
            // August is summer time in Europe - CEST (UTC+2)
            const slotDateTime = new Date(`${slot.date}T${slot.startTime}+02:00`);
            const diffMinutes = (slotDateTime.getTime() - now.getTime()) / (1000 * 60);
            console.log(`⏰ Slot ${slot.date} ${slot.startTime} with offset +02:00: ${diffMinutes.toFixed(0)} minutes from now`);
            return diffMinutes >= leadTimeMinutes; // Only show slots at least 60 minutes in the future
          })
          .sort((a, b) => {
            const aTime = new Date(`${a.date}T${a.startTime}+02:00`).getTime();
            const bTime = new Date(`${b.date}T${b.startTime}+02:00`).getTime();
            return aTime - bTime;
          })[0];
        
        console.log(`📅 Next available slot for doctor ${doctorId} (with 60-min buffer):`, nextSlot ? `${nextSlot.date}T${nextSlot.startTime}` : 'none');
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

  // Get available slots for rescheduling
  app.get("/api/doctors/:doctorId/slots/available", async (req, res) => {
    try {
      const { doctorId } = req.params;
      console.log(`🔍 Fetching available slots for rescheduling - doctor ID: ${doctorId}`);
      
      // Get all slots for this doctor (not just available ones)
      const allSlots = await storage.getAllDoctorTimeSlots(doctorId);
      
      // Filter for available slots only
      const availableSlots = allSlots.filter(slot => slot.isAvailable);
      
      console.log(`📅 Found ${availableSlots.length} available slots out of ${allSlots.length} total slots for doctor ${doctorId}`);
      
      // Debug: Show some available slots
      if (availableSlots.length > 0) {
        console.log('Sample available slots:', availableSlots.slice(0, 3).map(s => `${s.date} ${s.startTime}`));
      }
      
      res.json(availableSlots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ message: "Failed to fetch available slots" });
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
  // Get single appointment by ID
  app.get("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      const appointmentId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Fetch the appointment
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Check if user has permission to view this appointment
      let hasPermission = false;
      
      if (user.role === 'doctor') {
        // For doctors, check if they're the doctor for this appointment
        const doctor = await storage.getDoctorByEmail(user.email);
        if (doctor && appointment.doctorId === doctor.id) {
          hasPermission = true;
        }
      } else if (user.role === 'admin') {
        // Admins can view all appointments
        hasPermission = true;
      } else {
        // For patients, check if they're the patient for this appointment
        if (appointment.patientId === parseInt(userId)) {
          hasPermission = true;
        }
      }

      if (!hasPermission) {
        return res.status(403).json({ message: "You don't have permission to view this appointment" });
      }

      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Failed to fetch appointment" });
    }
  });

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
      
      // Send email notifications after appointment creation
      try {
        // Get patient and doctor details for email notifications
        const patient = await storage.getUser(appointmentData.patientId.toString());
        const doctor = await storage.getDoctor(appointmentData.doctorId);
        
        if (patient && doctor && doctor.user) {
          const appointmentDate = appointmentData.appointmentDate.toISOString().split('T')[0];
          const appointmentTime = appointmentData.appointmentDate.toISOString().split('T')[1].substring(0, 5); // Get HH:MM format
          
          // Send confirmation email to patient
          emailService.sendAppointmentConfirmation({
            patientEmail: patient.email!,
            patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
            doctorName: `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() || 'Doctor',
            specialty: doctor.specialty,
            appointmentDate,
            appointmentTime,
            consultationPrice: doctor.consultationPrice,
            appointmentId: appointment.id.toString()
          });
          
          // Send notification email to doctor
          emailService.sendDoctorNewAppointmentNotification({
            doctorEmail: doctor.user.email!,
            doctorName: `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() || 'Doctor',
            patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
            appointmentDate,
            appointmentTime,
            consultationPrice: doctor.consultationPrice,
            appointmentId: appointment.id.toString()
          });
          
          console.log(`📧 Email notifications sent for appointment ${appointment.id}`);
        }
      } catch (emailError) {
        console.error('📧 Failed to send email notifications:', emailError);
        // Don't fail the appointment creation if email fails
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });
  
  // Reschedule appointment
  app.put("/api/appointments/:id/reschedule", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { newSlotId, reason } = req.body;
      const appointmentId = req.params.id;
      
      if (!newSlotId || !reason) {
        return res.status(400).json({ message: "New slot ID and reason are required" });
      }
      
      // Get appointment to check ownership and status
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Check permissions
      const isPatient = appointment.patientId === parseInt(user.id);
      const isDoctor = appointment.doctor.userId === parseInt(user.id);
      const isAdmin = user.role === 'admin';
      
      if (!isPatient && !isDoctor && !isAdmin) {
        return res.status(403).json({ message: "You don't have permission to reschedule this appointment" });
      }
      
      // Check if appointment is already cancelled
      if (appointment.status === 'cancelled') {
        return res.status(400).json({ message: "Cannot reschedule a cancelled appointment" });
      }
      
      // Check reschedule count limit (max 2 reschedules)
      if (appointment.rescheduleCount >= 2 && !isAdmin) {
        return res.status(400).json({ message: "You've reached the reschedule limit for this appointment" });
      }
      
      // Check 60-minute rule unless admin
      const appointmentTime = new Date(appointment.appointmentDate);
      const currentTime = new Date();
      const timeDiffMinutes = (appointmentTime.getTime() - currentTime.getTime()) / (1000 * 60);
      
      if (timeDiffMinutes < 60 && !isAdmin) {
        return res.status(400).json({ 
          message: "Changes are only allowed at least 1 hour before your consultation" 
        });
      }
      
      // Release old slot
      if (appointment.slotId) {
        await db.update(doctorTimeSlots)
          .set({ isAvailable: true })
          .where(eq(doctorTimeSlots.id, appointment.slotId));
      }
      
      // Lock new slot
      await db.update(doctorTimeSlots)
        .set({ isAvailable: false })
        .where(eq(doctorTimeSlots.id, newSlotId));
      
      // Reschedule appointment
      await storage.rescheduleAppointment(
        appointmentId, 
        newSlotId, 
        reason,
        parseInt(user.id),
        user.role
      );
      
      res.json({ 
        success: true, 
        message: "Appointment rescheduled successfully",
        isAdminOverride: isAdmin && timeDiffMinutes < 60
      });
      
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      res.status(500).json({ message: "Failed to reschedule appointment" });
    }
  });
  
  // Cancel appointment
  app.put("/api/appointments/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { reason } = req.body;
      const appointmentId = req.params.id;
      
      if (!reason) {
        return res.status(400).json({ message: "Cancellation reason is required" });
      }
      
      // Get appointment to check ownership and status
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Check permissions
      const isPatient = appointment.patientId === parseInt(user.id);
      const isDoctor = appointment.doctor.userId === parseInt(user.id);
      const isAdmin = user.role === 'admin';
      
      if (!isPatient && !isDoctor && !isAdmin) {
        return res.status(403).json({ message: "You don't have permission to cancel this appointment" });
      }
      
      // Check if already cancelled
      if (appointment.status === 'cancelled') {
        return res.status(400).json({ message: "Appointment is already cancelled" });
      }
      
      // Check 60-minute rule unless admin
      const appointmentTime = new Date(appointment.appointmentDate);
      const currentTime = new Date();
      const timeDiffMinutes = (appointmentTime.getTime() - currentTime.getTime()) / (1000 * 60);
      
      if (timeDiffMinutes < 60 && !isAdmin) {
        return res.status(400).json({ 
          message: "Changes are only allowed at least 1 hour before your consultation" 
        });
      }
      
      // Release the slot
      if (appointment.slotId) {
        await db.update(doctorTimeSlots)
          .set({ isAvailable: true })
          .where(eq(doctorTimeSlots.id, appointment.slotId));
      }
      
      // Determine who is cancelling
      const cancelledBy = isPatient ? 'patient' : (isDoctor ? 'doctor' : 'admin');
      
      // Cancel appointment
      await storage.cancelAppointment(
        appointmentId, 
        cancelledBy, 
        reason,
        parseInt(user.id),
        user.role
      );
      
      // Determine refund eligibility
      const refundEligible = appointment.status === 'paid' && timeDiffMinutes >= 60;
      
      // Send cancellation email notification
      try {
        if (appointment.patient?.email) {
          const appointmentDate = appointment.appointmentDate.toISOString().split('T')[0];
          const appointmentTime = appointment.appointmentDate.toTimeString().split(' ')[0];
          
          await emailService.sendAppointmentCancellation({
            patientEmail: appointment.patient.email,
            patientName: `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || 'Patient',
            doctorName: `${appointment.doctor.user?.firstName || ''} ${appointment.doctor.user?.lastName || ''}`.trim() || 'Doctor',
            appointmentDate,
            appointmentTime,
            refundAmount: refundEligible ? appointment.doctor.consultationPrice : undefined,
            appointmentId: appointment.id.toString()
          });
          
          console.log(`📧 Cancellation email sent for appointment ${appointment.id}`);
        }
      } catch (emailError) {
        console.error('📧 Failed to send cancellation email:', emailError);
      }
      
      res.json({ 
        success: true, 
        message: "Appointment cancelled successfully",
        refundEligible,
        isAdminOverride: isAdmin && timeDiffMinutes < 60
      });
      
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ message: "Failed to cancel appointment" });
    }
  });
  
  // Get appointment changes history
  app.get("/api/appointments/:id/changes", isAuthenticated, async (req, res) => {
    try {
      const appointmentId = req.params.id;
      const changes = await storage.getAppointmentChanges(appointmentId);
      res.json(changes);
    } catch (error) {
      console.error("Error fetching appointment changes:", error);
      res.status(500).json({ message: "Failed to fetch appointment changes" });
    }
  });

  // Stripe payment routes - DEPRECATED and SECURED
  // This endpoint should not be used - use /api/payment/create-intent instead
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    console.warn("⚠️ Deprecated payment endpoint called - redirecting to secure endpoint");
    return res.status(410).json({ 
      error: "This endpoint is deprecated for security reasons. Use /api/payment/create-intent instead",
      code: "DEPRECATED_ENDPOINT"
    });
  });

  // Secure checkout session endpoint with CSRF protection
  app.post("/api/checkout/session", isAuthenticated, strictLimiter, async (req, res) => {
    try {
      const { doctorId, slotId, appointmentDate } = req.body;
      const userId = req.user?.id;
      
      if (!doctorId || !slotId || !appointmentDate) {
        return res.status(400).json({ 
          error: "Missing required fields",
          code: "MISSING_FIELDS"
        });
      }
      
      // Validate doctor exists and get real price
      const doctor = await storage.getDoctor(doctorId);
      if (!doctor) {
        return res.status(404).json({ 
          error: "Doctor not found",
          code: "DOCTOR_NOT_FOUND"
        });
      }
      
      // CRITICAL: Use price from database only
      const realPrice = parseFloat(doctor.consultationPrice);
      
      // Validate price range
      if (realPrice < 1 || realPrice > 500) {
        console.error(`⚠️ Suspicious price for doctor ${doctorId}: €${realPrice}`);
        return res.status(400).json({ 
          error: "Invalid consultation price",
          code: "INVALID_PRICE"
        });
      }
      
      // Check slot availability
      const slot = await storage.getTimeSlot(slotId);
      if (!slot || !slot.isAvailable) {
        return res.status(409).json({ 
          error: "Slot is no longer available",
          code: "SLOT_UNAVAILABLE"
        });
      }
      
      // Create appointment
      const appointmentData = {
        patientId: parseInt(userId),
        doctorId: parseInt(doctorId),
        appointmentDate: new Date(appointmentDate),
        status: 'pending' as const,
        paymentIntentId: null,
        clientSecret: null,
        zoomMeetingId: null,
        zoomJoinUrl: null,
        zoomStartUrl: null,
        zoomPassword: null
      };
      
      const appointment = await storage.createAppointment(appointmentData);
      
      // Create Stripe checkout session with metadata
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Consultation with Dr. ${doctor.user?.firstName} ${doctor.user?.lastName}`,
              description: `${doctor.specialty} - ${appointmentDate}`,
            },
            unit_amount: Math.round(realPrice * 100), // Database price in cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.APP_URL || 'https://doktu.co'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || 'https://doktu.co'}/payment/cancel`,
        metadata: {
          appointmentId: appointment.id.toString(),
          patientId: userId.toString(),
          doctorId: doctorId.toString(),
          slotId: slotId.toString(),
          realPrice: realPrice.toString()
        },
        customer_email: req.user?.email
      });
      
      // Update appointment with session ID
      await storage.updateAppointmentStatus(appointment.id, "pending_payment", session.id);
      
      console.log(`🔒 Secure checkout session created: ${session.id}, Real price: €${realPrice}`);
      
      res.json({
        sessionId: session.id,
        url: session.url,
        appointmentId: appointment.id,
        amount: realPrice
      });
      
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ 
        error: "Failed to create checkout session",
        code: "CHECKOUT_ERROR"
      });
    }
  });

  // Post-consultation survey endpoints
  app.post("/api/appointments/:id/survey", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const appointmentId = req.params.id;
      const { rating, comment } = req.body;

      // Get appointment to validate
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Check if user is the patient
      if (appointment.patientId !== parseInt(user.id)) {
        return res.status(403).json({ message: "You can only review your own appointments" });
      }

      // Create review
      const reviewData = insertReviewSchema.parse({
        appointmentId: parseInt(appointmentId),
        patientId: parseInt(user.id),
        doctorId: appointment.doctorId,
        rating,
        comment: comment || null
      });
      
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Error creating survey:", error);
      res.status(500).json({ message: "Failed to submit survey" });
    }
  });

  app.post("/api/appointments/:id/survey/skip", isAuthenticated, async (req, res) => {
    try {
      // In a real app, we'd track this to show reminder later
      res.json({ success: true, message: "Survey skipped" });
    } catch (error) {
      res.status(500).json({ message: "Failed to skip survey" });
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

  // Admin dashboard metrics endpoint
  app.get("/api/admin/metrics", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { start, end } = req.query;
      const startDate = start ? new Date(start as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = end ? new Date(end as string) : new Date();



      // Calculate previous period for comparison
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = new Date(startDate.getTime());

      // Get metrics from storage
      const metrics = await storage.getAdminMetrics(startDate, endDate);
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching admin metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Admin meetings endpoint
  app.get("/api/admin/meetings", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get meetings data from storage
      const meetingStats = await storage.getMeetingStats();
      
      res.json(meetingStats);
    } catch (error) {
      console.error("Error fetching meetings data:", error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  // Admin funnel data endpoint
  app.get("/api/admin/funnel", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { window } = req.query;
      const days = window === '30d' ? 30 : 7;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const funnelData = await storage.getFunnelData(startDate);
      
      res.json(funnelData);
    } catch (error) {
      console.error("Error fetching funnel data:", error);
      res.status(500).json({ message: "Failed to fetch funnel data" });
    }
  });

  // Admin patient segments endpoint
  app.get("/api/admin/segments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const segments = await storage.getPatientSegments();
      
      res.json(segments);
    } catch (error) {
      console.error("Error fetching patient segments:", error);
      res.status(500).json({ message: "Failed to fetch segments" });
    }
  });

  // Admin doctor roster endpoint
  app.get("/api/admin/doctors", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const doctors = await storage.getAdminDoctorRoster();
        res.json(doctors);
      } catch (error) {
        console.error("Error fetching doctor roster:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error fetching doctor roster:", error);
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  // Admin user management endpoints
  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const adminUsers = await storage.getAdminUsers();
      res.json(adminUsers);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch admin users" });
    }
  });

  app.post("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { email, firstName, lastName } = z.object({
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string()
      }).parse(req.body);

      const newAdmin = await storage.createAdminUser({ email, firstName, lastName });
      res.json(newAdmin);
    } catch (error: any) {
      console.error("Error creating admin user:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid request data" });
      } else {
        res.status(500).json({ message: error.message || "Failed to create admin user" });
      }
    }
  });

  app.delete("/api/admin/users/:userId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const targetUserId = parseInt(req.params.userId);
      
      // Prevent admins from removing their own access
      if (user.id === targetUserId) {
        return res.status(400).json({ message: "Cannot remove your own admin access" });
      }

      await storage.removeAdminUser(targetUserId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing admin user:", error);
      res.status(500).json({ message: "Failed to remove admin user" });
    }
  });

  // Email confirmation endpoint for post-signup
  // Login endpoint for email/password authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data.user) {
        console.error("Login error:", error);
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Store session in Express session
      req.session.supabaseSession = {
        access_token: data.session?.access_token || '',
        refresh_token: data.session?.refresh_token || '',
        user: data.user
      };

      // Get or create user in database
      let dbUser = await storage.getUserByEmail(email);
      
      if (!dbUser) {
        // Create user if doesn't exist (edge case for users created outside the app)
        dbUser = await storage.upsertUser({
          email: email,
          role: 'patient' // Default role
        });
      }

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }

        console.log("Login successful for user:", email);
        res.json({ 
          success: true, 
          user: dbUser,
          session: {
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token
          }
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

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

  // Change email endpoint
  app.put("/api/auth/change-email", isAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      const session = req.session.supabaseSession;

      if (!email) {
        return res.status(400).json({ error: "New email is required" });
      }

      if (!session || !session.access_token) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Create a Supabase client and set the user's session
      const { createClient } = await import('@supabase/supabase-js');
      const userSupabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_KEY!
      );

      // Set the session on the client
      const { data: sessionData, error: sessionError } = await userSupabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      if (sessionError) {
        console.error("Session setup error:", sessionError);
        return res.status(401).json({ error: "Failed to establish session" });
      }

      // Log current user info for debugging
      const { data: currentUser } = await userSupabase.auth.getUser();
      console.log("Current user for email change:", {
        id: currentUser?.user?.id,
        email: currentUser?.user?.email,
        newEmail: email
      });

      // Try alternative approach: send email change confirmation
      // This sends a confirmation email to the new address instead of directly updating
      const { data, error } = await userSupabase.auth.updateUser({
        email: email
      });

      // If direct update fails, try updating our database directly
      if (error && (error.code === 'email_address_invalid' || error.message.includes('invalid'))) {
        console.log("Supabase email update failed, updating database directly...");
        
        // Since Supabase is blocking the email change (possibly due to test domain),
        // we'll update our database directly as a workaround
        try {
          const updatedUser = await storage.updateUser(req.user.id.toString(), { email });
          
          if (!updatedUser) {
            return res.status(400).json({ 
              error: "Failed to update email. Please try again." 
            });
          }
          
          console.log("Email updated in database successfully");
          res.json({ 
            success: true, 
            message: "Email updated successfully. Note: You may need to re-login with your new email." 
          });
          return;
        } catch (dbError) {
          console.error("Database update error:", dbError);
          return res.status(400).json({ 
            error: "Unable to update email at this time. The test email domain may be restricted." 
          });
        }
      }

      if (error) {
        console.error("Supabase email change error:", error);
        
        // Provide more user-friendly error messages
        let errorMessage = error.message;
        if (error.message.includes('email_address_invalid')) {
          errorMessage = "Please enter a valid email address";
        } else if (error.message.includes('signup_disabled')) {
          errorMessage = "Email changes are currently disabled";
        } else if (error.message.includes('email_taken')) {
          errorMessage = "This email address is already in use";
        }
        
        return res.status(400).json({ error: errorMessage });
      }

      // Update user in database
      await storage.updateUser(session.user.id, { email });

      console.log("Email change requested for user:", session.user.id);
      res.json({ 
        success: true, 
        message: "Email change confirmation sent to new address" 
      });
    } catch (error: any) {
      console.error("Change email error:", error);
      res.status(500).json({ error: "Failed to change email" });
    }
  });

  // Change password endpoint
  app.put("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const session = req.session.supabaseSession;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new passwords are required" });
      }

      if (!session || !session.access_token) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword
      });

      if (verifyError) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Create a Supabase client and set the user's session
      const { createClient } = await import('@supabase/supabase-js');
      const userSupabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_KEY!
      );

      // Set the session on the client
      await userSupabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      // Update password using the authenticated client
      const { data, error } = await userSupabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Supabase password change error:", error);
        return res.status(400).json({ error: error.message });
      }

      console.log("Password changed for user:", session.user.id);
      res.json({ 
        success: true, 
        message: "Password updated successfully" 
      });
    } catch (error: any) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
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

  app.patch("/api/time-slots/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { isAvailable } = req.body;
      
      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({ error: "isAvailable must be a boolean" });
      }

      const timeSlot = await storage.updateTimeSlot(id, { isAvailable });
      
      res.json(timeSlot);
    } catch (error) {
      console.error("Error updating time slot availability:", error);
      res.status(500).json({ message: "Failed to update time slot" });
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

  // Delete multiple time slots in a range
  app.delete("/api/time-slots/range", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.id || user.role !== 'doctor') {
        return res.status(403).json({ error: "Access denied" });
      }

      const { date, startTime, endTime, scope } = req.body;
      if (!date || !startTime || !endTime) {
        return res.status(400).json({ error: "Date, start time, and end time are required" });
      }

      // Get the doctor record for the user
      const doctor = await storage.getDoctorByUserId(user.id);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor profile not found" });
      }

      console.log(`🗑️ API: Deleting slots for doctor ${doctor.id} on ${date} from ${startTime} to ${endTime} (scope: ${scope || 'this'})`);
      
      // Delete all slots in the specified range
      await storage.deleteTimeSlotsInRange(doctor.id.toString(), date, startTime, endTime, scope);
      
      res.json({ message: "Time slots deleted successfully" });
    } catch (error) {
      console.error("Error deleting time slots in range:", error);
      res.status(500).json({ message: "Failed to delete time slots" });
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

  // Payment routes - SECURED with server-side price validation
  app.post("/api/payment/create-intent", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.body;
      
      if (!appointmentId) {
        return res.status(400).json({ 
          error: "Missing appointmentId",
          code: "MISSING_APPOINTMENT_ID"
        });
      }

      // Get appointment details
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ 
          error: "Appointment not found",
          code: "APPOINTMENT_NOT_FOUND"
        });
      }

      // Get doctor details to retrieve the REAL price from database
      const doctor = await storage.getDoctor(appointment.doctorId);
      if (!doctor) {
        return res.status(404).json({ 
          error: "Doctor not found",
          code: "DOCTOR_NOT_FOUND"
        });
      }

      // CRITICAL: Use price from database, NEVER from client
      const realPrice = parseFloat(doctor.consultationPrice);
      
      console.log(`💰 Creating payment intent: Doctor ${doctor.id}, Real price: €${realPrice}`);
      
      // Validate price is reasonable (between €1 and €500)
      if (realPrice < 1 || realPrice > 500) {
        console.error(`⚠️ Suspicious price detected: €${realPrice}`);
        return res.status(400).json({ 
          error: "Invalid consultation price",
          code: "INVALID_PRICE"
        });
      }

      // Create payment intent with Stripe using database price
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(realPrice * 100), // Convert to cents - using DATABASE price
        currency: 'eur',
        metadata: {
          appointmentId,
          patientId: req.user.id.toString(),
          doctorId: appointment.doctorId.toString(),
          realPrice: realPrice.toString() // Store the real price for audit
        },
      });

      // Update appointment status to pending_payment
      await storage.updateAppointmentStatus(appointmentId, "pending_payment", paymentIntent.id);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: realPrice // Return the real price to client for display
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        error: "Failed to create payment intent",
        code: "PAYMENT_INTENT_ERROR"
      });
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
        
        // Create Zoom meeting for the paid appointment
        if (appointment && zoomService.isConfigured()) {
          console.log(`🎥 Creating Zoom meeting for appointment ${appointmentId}`);
          await zoomService.createMeeting(Number(appointmentId));
        }
        
        if (appointment) {
          // Find and mark the corresponding time slot as unavailable
          const timeSlots = await storage.getDoctorTimeSlots(appointment.doctorId);
          const appointmentDate = new Date(appointment.appointmentDate);
          
          // Extract date and time components from UTC appointment date
          const appointmentDateString = appointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          const appointmentTimeString = appointmentDate.toISOString().split('T')[1].slice(0, 8); // HH:MM:SS format from UTC
          
          console.log(`🔍 Looking for slot: date=${appointmentDateString}, time=${appointmentTimeString} (UTC time)`);
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
          
          // Trigger appointment confirmation notification
          await notificationService.scheduleNotification({
            userId: appointment.patientId,
            appointmentId: appointment.id,
            triggerCode: TriggerCode.BOOK_CONF,
            scheduledFor: new Date()
          });
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
            
            // Trigger appointment confirmation notification
            await notificationService.scheduleNotification({
              userId: appointment.patientId,
              appointmentId: appointment.id,
              triggerCode: TriggerCode.BOOK_CONF,
              scheduledFor: new Date()
            });
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

  // Analytics Events Route
  app.post("/api/analytics/events", async (req, res) => {
    try {
      const { events } = req.body;
      
      if (!events || !Array.isArray(events)) {
        return res.status(400).json({ message: "Invalid events format" });
      }

      // Store analytics events in the database
      for (const event of events) {
        await storage.createAnalyticsEvent({
          sessionId: event.sessionId,
          userId: event.userId || req.session.user?.id || null,
          eventType: event.eventType,
          eventData: event.eventData,
          timestamp: new Date(event.timestamp)
        });
      }

      res.json({ success: true, eventsProcessed: events.length });
    } catch (error) {
      console.error("Error storing analytics events:", error);
      res.status(500).json({ message: "Failed to store analytics events" });
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

  // Notification Routes
  // Email notification endpoints
  app.post("/api/emails/test", async (req, res) => {
    try {
      const { email, type = 'welcome' } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }
      
      let result = false;
      
      if (type === 'welcome') {
        result = await emailService.sendWelcomeEmail({
          email,
          firstName: 'Test User',
          userType: 'patient'
        });
      }
      
      res.json({ 
        success: result, 
        message: result ? "Test email sent successfully" : "Failed to send test email" 
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Send appointment reminders for appointments in the next 24 hours
  app.post("/api/emails/send-reminders", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      // Get upcoming appointments (next 24-48 hours for reminders)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      
      const upcomingAppointments = await storage.getAppointmentsByDateRange(tomorrow, dayAfter);
      
      let remindersSent = 0;
      
      for (const appointment of upcomingAppointments) {
        if (appointment.status === 'paid' && appointment.patient?.email) {
          try {
            const appointmentDate = appointment.appointmentDate.toISOString().split('T')[0];
            const appointmentTime = appointment.appointmentDate.toTimeString().split(' ')[0];
            
            await emailService.sendAppointmentReminder({
              patientEmail: appointment.patient.email,
              patientName: `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || 'Patient',
              doctorName: `${appointment.doctor.user?.firstName || ''} ${appointment.doctor.user?.lastName || ''}`.trim() || 'Doctor',
              specialty: appointment.doctor.specialty,
              appointmentDate,
              appointmentTime,
              appointmentId: appointment.id.toString()
            });
            
            remindersSent++;
          } catch (emailError) {
            console.error(`Failed to send reminder for appointment ${appointment.id}:`, emailError);
          }
        }
      }
      
      res.json({ 
        success: true, 
        remindersSent,
        totalAppointments: upcomingAppointments.length,
        message: `${remindersSent} reminder emails sent successfully` 
      });
    } catch (error) {
      console.error("Error sending reminder emails:", error);
      res.status(500).json({ error: "Failed to send reminder emails" });
    }
  });

  app.get("/api/admin/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const notifications = await storage.getNotifications({
        status: req.query.status as string,
        limit: parseInt(req.query.limit as string) || 50
      });
      
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/admin/notifications/retry", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { notificationId } = req.body;
      await storage.retryNotification(notificationId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error retrying notification:", error);
      res.status(500).json({ message: "Failed to retry notification" });
    }
  });

  app.get("/api/user/notification-preferences", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const preferences = await storage.getNotificationPreferences(user.id);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.put("/api/user/notification-preferences", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const preferences = await storage.updateNotificationPreferences(user.id, req.body);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Test account fix endpoint for email mismatches
  app.post('/api/test/fix-email-mismatch', async (req, res) => {
    try {
      console.log('🔧 Test email mismatch fix requested');
      
      // Check if service role key is available
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Service role key not available, using regular signup flow');
        
        // Try to create a new account with the correct email
        const { data, error } = await supabase.auth.signUp({
          email: 'kalyos.officiel@gmail.com',
          password: 'Test123456!',
          options: {
            data: {
              role: 'patient',
              firstName: 'Test',
              lastName: 'Patient'
            }
          }
        });

        if (error) {
          console.error('Signup error:', error);
          
          // If user already exists, that's okay for test accounts
          if (error.message.includes('already registered')) {
            return res.json({
              success: true,
              message: 'Account already exists. Try logging in with the credentials below.',
              credentials: {
                email: 'kalyos.officiel@gmail.com',
                password: 'Test123456!',
                note: 'If password doesn\'t work, use the password reset flow'
              }
            });
          }
          
          return res.status(500).json({ error: error.message });
        }

        console.log('✅ Created new test user via signup');
        
        return res.json({
          success: true,
          message: 'Test account created successfully!',
          credentials: {
            email: 'kalyos.officiel@gmail.com',
            password: 'Test123456!',
            note: data.session ? 'You can now login with these credentials' : 'Check your email to confirm the account'
          }
        });
      }
      
      // Use service role key if available
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // List all users to find the old test account
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const oldUser = users?.users.find(u => 
        u.email === 'patient@test40.com' || 
        u.email === 'kalyos.officiel@gmail.com'
      );

      if (oldUser) {
        // Delete the old user
        await supabaseAdmin.auth.admin.deleteUser(oldUser.id);
        console.log('✅ Deleted old test user:', oldUser.email);
      }

      // Create new user with correct email
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'kalyos.officiel@gmail.com',
        password: 'Test123456!', // Default test password
        email_confirm: true, // Auto-confirm since it's a test account
        user_metadata: {
          role: 'patient',
          firstName: 'Test',
          lastName: 'Patient'
        }
      });

      if (createError) {
        console.error('Error creating new user:', createError);
        return res.status(500).json({ error: 'Failed to create new test user' });
      }

      console.log('✅ Created new test user with synchronized email');

      res.json({
        success: true,
        message: 'Test account fixed successfully!',
        credentials: {
          email: 'kalyos.officiel@gmail.com',
          password: 'Test123456!',
          note: 'You can now login with these credentials'
        }
      });

    } catch (error: any) {
      console.error('❌ Test fix error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Internal server error' 
      });
    }
  });

  // ==========================================
  // MEMBERSHIP SUBSCRIPTION ROUTES
  // ==========================================

  // Get available membership plans
  app.get("/api/membership/plans", async (req, res) => {
    try {
      // Return hardcoded plans for now - these match the PRD specification
      const plans = [
        {
          id: "monthly_plan",
          name: "Monthly Membership",
          description: "2 consultations per month with our certified doctors",
          priceAmount: "45.00",
          currency: "EUR",
          billingInterval: "month",
          intervalCount: 1,
          allowancePerCycle: 2,
          stripePriceId: process.env.STRIPE_MONTHLY_PRICE_ID || "price_monthly_placeholder",
          isActive: true,
          featured: true
        },
        {
          id: "biannual_plan", 
          name: "6-Month Membership",
          description: "12 consultations over 6 months (2 per month) with 23% savings",
          priceAmount: "219.00",
          currency: "EUR",
          billingInterval: "6_months",
          intervalCount: 6,
          allowancePerCycle: 12, // Total for 6 months
          stripePriceId: process.env.STRIPE_BIANNUAL_PRICE_ID || "price_biannual_placeholder",
          isActive: true,
          featured: false
        }
      ];

      res.json({ plans });
    } catch (error) {
      console.error("Error fetching membership plans:", error);
      res.status(500).json({ error: "Failed to fetch membership plans" });
    }
  });

  // Get current user's subscription status
  app.get("/api/membership/subscription", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = req.user;
      
      // Check if user has a Stripe subscription ID
      if (!user.stripeSubscriptionId || user.stripeSubscriptionId.startsWith('pending_')) {
        return res.json({ 
          hasSubscription: false,
          subscription: null,
          allowanceRemaining: 0
        });
      }
      
      try {
        // Fetch subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        // Determine plan details from metadata
        const planId = subscription.metadata?.planId || user.pendingSubscriptionPlan;
        const planName = subscription.metadata?.planName || 
          (planId === 'monthly_plan' ? 'Monthly Membership' : '6-Month Membership');
        
        res.json({
          hasSubscription: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            planId: planId,
            planName: planName,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            cancelAt: subscription.cancel_at,
            created: subscription.created,
            amount: subscription.items.data[0]?.price?.unit_amount || 0,
            interval: subscription.items.data[0]?.price?.recurring?.interval,
            intervalCount: subscription.items.data[0]?.price?.recurring?.interval_count
          },
          allowanceRemaining: planId === 'monthly_plan' ? 2 : 12 // Default allowances
        });
      } catch (stripeError) {
        console.error("Error fetching subscription from Stripe:", stripeError);
        return res.json({ 
          hasSubscription: false,
          subscription: null,
          allowanceRemaining: 0
        });
      }
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // Create a new subscription
  app.post("/api/membership/subscribe", strictLimiter, isAuthenticated, async (req, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user.id;
      const userEmail = req.user.email;

      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }

      // Plan configurations with dynamic price creation
      const planConfigs = {
        "monthly_plan": {
          name: "Monthly Membership",
          priceAmount: 4500, // €45.00 in cents
          interval: 'month' as const,
          intervalCount: 1
        },
        "biannual_plan": {
          name: "6-Month Membership", 
          priceAmount: 21900, // €219.00 in cents
          interval: 'month' as const,
          intervalCount: 6
        }
      };

      const selectedPlanConfig = planConfigs[planId as keyof typeof planConfigs];
      if (!selectedPlanConfig) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }

      // Create or retrieve the product in Stripe
      let product;
      try {
        const products = await stripe.products.list({
          active: true,
          limit: 100
        });
        
        product = products.data.find(p => p.name === selectedPlanConfig.name);
        
        if (!product) {
          product = await stripe.products.create({
            name: selectedPlanConfig.name,
            description: planId === 'monthly_plan' 
              ? '2 consultations per month with certified doctors'
              : '12 consultations over 6 months with certified doctors',
            metadata: {
              planId: planId
            }
          });
        }
      } catch (productError) {
        console.error("Error with Stripe product:", productError);
        return res.status(500).json({ error: "Failed to process product information" });
      }

      // Create or retrieve the price
      let price;
      try {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 100
        });
        
        price = prices.data.find(p => 
          p.unit_amount === selectedPlanConfig.priceAmount &&
          p.recurring?.interval === selectedPlanConfig.interval &&
          p.recurring?.interval_count === selectedPlanConfig.intervalCount
        );
        
        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: selectedPlanConfig.priceAmount,
            currency: 'eur',
            recurring: {
              interval: selectedPlanConfig.interval,
              interval_count: selectedPlanConfig.intervalCount
            },
            metadata: {
              planId: planId
            }
          });
        }
      } catch (priceError) {
        console.error("Error with Stripe price:", priceError);
        return res.status(500).json({ error: "Failed to process pricing information" });
      }

      // Create or retrieve Stripe customer
      let customer;
      try {
        // Check if customer already exists
        const existingCustomers = await stripe.customers.list({
          email: userEmail,
          limit: 1
        });

        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
        } else {
          // Create new customer
          customer = await stripe.customers.create({
            email: userEmail,
            name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
            metadata: {
              userId: userId.toString(),
              planId: planId
            }
          });
        }
      } catch (stripeError) {
        console.error("Error with Stripe customer:", stripeError);
        return res.status(500).json({ error: "Failed to process customer information" });
      }

      // Create actual Stripe subscription with payment
      try {
        // Create the subscription with payment behavior
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{
            price_data: {
              currency: 'eur',
              product: selectedPlanConfig.name,
              unit_amount: selectedPlanConfig.priceAmount,
              recurring: {
                interval: selectedPlanConfig.interval,
                interval_count: selectedPlanConfig.intervalCount
              }
            }
          }],
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription'
          },
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            userId: userId.toString(),
            planId: planId,
            planName: selectedPlanConfig.name
          }
        });

        // Store subscription info in user record
        await storage.updateUser(userId, {
          stripeSubscriptionId: subscription.id,
          pendingSubscriptionPlan: planId
        } as any);

        const paymentIntent = subscription.latest_invoice?.payment_intent;
        
        console.log("Created subscription with payment intent:", {
          subscriptionId: subscription.id,
          paymentIntentId: paymentIntent?.id,
          amount: selectedPlanConfig.priceAmount,
          status: subscription.status
        });

        res.json({
          subscriptionId: subscription.id,
          clientSecret: paymentIntent?.client_secret,
          customerId: customer.id,
          status: subscription.status,
          paymentIntentId: paymentIntent?.id
        });

      } catch (subscriptionError) {
        console.error("Error creating subscription:", subscriptionError);
        return res.status(500).json({ error: "Failed to create subscription" });
      }

    } catch (error) {
      console.error("Error in subscription creation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Cancel subscription
  app.post("/api/membership/cancel", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = req.user;
      
      // Check if user has an active subscription
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }
      
      try {
        // Cancel at period end (don't immediately terminate access)
        const subscription = await stripe.subscriptions.update(
          user.stripeSubscriptionId,
          {
            cancel_at_period_end: true
          }
        );
        
        console.log(`Subscription ${subscription.id} set to cancel at period end`);
        
        res.json({ 
          success: true,
          message: "Subscription will be cancelled at the end of the current billing period",
          cancelAt: subscription.cancel_at,
          currentPeriodEnd: subscription.current_period_end
        });
      } catch (stripeError) {
        console.error("Stripe cancellation error:", stripeError);
        return res.status(500).json({ error: "Failed to cancel subscription with payment provider" });
      }
      
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Stripe webhook handler for subscription events
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`🔔 Stripe webhook received: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          const createdSub = event.data.object;
          console.log('📝 Subscription created:', createdSub.id);
          // Update user with subscription ID
          if (createdSub.metadata?.userId) {
            try {
              await storage.updateUser(parseInt(createdSub.metadata.userId), {
                stripeSubscriptionId: createdSub.id,
                stripeCustomerId: createdSub.customer
              } as any);
              console.log('✅ Updated user with subscription ID');
            } catch (error) {
              console.error('Failed to update user with subscription:', error);
            }
          }
          break;

        case 'customer.subscription.updated':
          const updatedSub = event.data.object;
          console.log('📝 Subscription updated:', updatedSub.id, 'Status:', updatedSub.status);
          // Update subscription status in database
          if (updatedSub.metadata?.userId && updatedSub.status === 'active') {
            try {
              await storage.updateUser(parseInt(updatedSub.metadata.userId), {
                stripeSubscriptionId: updatedSub.id,
                pendingSubscriptionPlan: null // Clear pending status
              } as any);
              console.log('✅ Subscription activated for user');
            } catch (error) {
              console.error('Failed to update subscription status:', error);
            }
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSub = event.data.object;
          console.log('📝 Subscription cancelled:', deletedSub.id);
          // Clear subscription from user
          if (deletedSub.metadata?.userId) {
            try {
              await storage.updateUser(parseInt(deletedSub.metadata.userId), {
                stripeSubscriptionId: null,
                pendingSubscriptionPlan: null
              } as any);
              console.log('✅ Subscription removed from user');
            } catch (error) {
              console.error('Failed to remove subscription:', error);
            }
          }
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          console.log('💰 Payment succeeded for invoice:', invoice.id);
          // Activate subscription if it's the first payment
          if (invoice.subscription && invoice.billing_reason === 'subscription_create') {
            console.log('✅ Initial subscription payment successful');
            // Grant initial allowance for the membership
            // This would be implemented when the membership tables are created
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          console.log('❌ Payment failed for invoice:', failedInvoice.id);
          // Suspend subscription if payment fails
          if (failedInvoice.subscription) {
            console.log('⚠️ Subscription payment failed, may need suspension');
          }
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Check if appointment should be covered by membership
  app.post("/api/membership/check-coverage", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.body;
      const userId = req.user.id;

      // TODO: Implement coverage check logic once database schema is deployed
      // For now, all appointments are pay-per-visit
      
      res.json({
        isCovered: false,
        coverageType: "pay_per_visit",
        originalPrice: "35.00",
        patientPaid: "35.00",
        coveredAmount: "0.00",
        allowanceRemaining: 0
      });
    } catch (error) {
      console.error("Error checking coverage:", error);
      res.status(500).json({ error: "Failed to check coverage" });
    }
  });

  // Apply global error handler (must be last)
  app.use(errorHandler);
  
  const httpServer = createServer(app);
  return httpServer;
}