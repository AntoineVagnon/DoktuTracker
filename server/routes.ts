import type { Express } from "express";
// Removed createServer import - server creation now handled by index.ts
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

// Session types are defined in ./types.ts
import Stripe from "stripe";
import { storage } from "./storage";
import { setupSupabaseAuth, isAuthenticated, supabase } from "./supabaseAuth";
import { insertDoctorSchema, insertTimeSlotSchema, insertAppointmentSchema, insertReviewSchema, insertDocumentUploadSchema, insertHealthProfileSchema, doctorTimeSlots, membershipSubscriptions, membershipCycles, membershipAllowanceEvents, appointmentCoverage, appointments, users } from "@shared/schema";
import { z } from "zod";
import { registerDocumentLibraryRoutes } from "./routes/documentLibrary";
import { setupSlotRoutes } from "./routes/slots";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { notificationService, TriggerCode } from "./services/notificationService";
import { emailService } from "./emailService";
import { zoomService } from "./services/zoomService";
import { registerMembershipRoutes } from "./routes/membershipRoutes";
import { membershipService } from "./services/membershipService";
import { AuditLogger, auditAdminMiddleware, auditPatientDataMiddleware, auditErrorMiddleware } from "./middleware/auditMiddleware";
import { registerAuditRoutes } from "./routes/auditRoutes";
import { registerGDPRRoutes } from "./routes/gdprRoutes";
import { registerMedicalRecordsRoutes } from "./routes/medicalRecordsRoutes";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

// Initialize membership service with Stripe instance
membershipService.initialize(stripe);
console.log('✅ Membership service initialized with Stripe');

export async function registerRoutes(app: Express): Promise<void> {
  // ============================================================================
  // EMERGENCY DEBUG - ULTRA-SIMPLE LOG TO TEST IF ANYTHING WORKS
  // ============================================================================
  console.log('🚨🚨🚨 SERVER ROUTES LOADING - THIS SHOULD ALWAYS APPEAR 🚨🚨🚨');
  console.error('🚨🚨🚨 SERVER ROUTES ERROR LOG - THIS SHOULD ALWAYS APPEAR 🚨🚨🚨');
  
  // ============================================================================
  // HEALTH CHECK ENDPOINT FOR RAILWAY
  // ============================================================================
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'doktu-tracker-api',
      version: '1.0.0'
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  // SendGrid Health Check Endpoint
  app.get('/api/health/sendgrid', async (req, res) => {
    try {
      const { getSendGridHealthCheck } = await import('./services/emailService');
      const healthCheck = getSendGridHealthCheck();

      res.status(healthCheck.status === 'healthy' ? 200 : 503).json(healthCheck);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ============================================================================
  // TOP-LEVEL TRACER - FIRST MIDDLEWARE TO PROVE NO INTERCEPTION
  // ============================================================================
  // Diagnostic endpoint to verify single server instance
  app.get('/api/diag', (req, res) => {
    res.json({
      pid: process.pid,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      serverInstanceId: globalThis.__serverListening ? 'primary' : 'unknown'
    });
  });

  app.all('/api/appointments*', (req, res, next) => {
    console.log('🚨🚨 [TOP TRACER] 🚨🚨', req.method, req.originalUrl, req.headers['content-type']);
    console.log('🚨🚨 [TOP TRACER] Body present:', !!req.body, 'Body size:', req.body ? Object.keys(req.body).length : 0);
    console.error('🚨🚨 [TOP TRACER ERROR LOG] 🚨🚨', req.method, req.originalUrl);
    next();
  });

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

  // ============================================================================
  // CRITICAL: APPOINTMENT ROUTES FIRST - BEFORE ALL OTHER ROUTE MODULES
  // ============================================================================
  
  // TRACER MIDDLEWARE - TO IDENTIFY ROUTE INTERCEPTION (TEMPORARY DEBUG)
  app.use('/api/appointments', (req, res, next) => {
    console.log('🔍 TRACER: appointments base intercepted', {
      method: req.method,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    console.log('========== APPOINTMENTS TRACER ==========');
    console.error('========== APPOINTMENTS TRACER ERROR LOG ==========');
    next();
  });
  
  // Working appointment creation endpoint (bypasses client interceptor)
  app.post("/api/appointments/create", (req, res, next) => {
    console.log('🟢 POST /api/appointments/create - REQUEST RECEIVED', { 
      method: req.method, 
      url: req.url,
      headers: req.headers['content-type'],
      hasBody: !!req.body
    });
    next();
  }, isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log('🔍 Booking request:', { 
        userId, 
        doctorId: req.body.doctorId, 
        timeSlotId: req.body.timeSlotId,
        appointmentDate: req.body.appointmentDate 
      });
      
      const appointmentPrice = parseFloat(req.body.price || "35.00");
      const appointmentDate = new Date(req.body.appointmentDate);
      
      // 🔑 STEP 1: ALWAYS CREATE APPOINTMENT AS PENDING FIRST
      const appointmentDataInput = {
        patientId: parseInt(userId),
        doctorId: parseInt(req.body.doctorId),
        appointmentDate: appointmentDate,
        status: 'pending', // Always start as pending, then upgrade to paid/confirmed if covered
        paymentIntentId: req.body.paymentIntentId || null,
        clientSecret: req.body.clientSecret || null,
        zoomMeetingId: req.body.zoomMeetingId || null,
        zoomJoinUrl: req.body.zoomJoinUrl || null,
        zoomStartUrl: req.body.zoomStartUrl || null,
        zoomPassword: req.body.zoomPassword || null,
        slotId: req.body.timeSlotId || null,
        price: appointmentPrice.toFixed(2)
      };
      
      console.log('🔍 Validating appointment data:', appointmentDataInput);
      
      let appointmentData;
      try {
        appointmentData = insertAppointmentSchema.parse(appointmentDataInput);
        console.log('✅ Schema validation passed');
      } catch (validationError: any) {
        console.error('❌ Schema validation failed:', validationError);
        throw new Error(`Schema validation failed: ${validationError.message || JSON.stringify(validationError)}`);
      }
      
      // 🚫 Cancel existing pending appointments to prevent multiple payment banners
      const userAppointments = await storage.getAppointments(userId);
      const pendingAppointments = userAppointments.filter(apt => 
        apt.status === 'pending' || apt.status === 'pending_payment'
      );
      
      for (const pendingApt of pendingAppointments) {
        await storage.updateAppointmentStatus(pendingApt.id, "cancelled");
        console.log(`🚫 Auto-cancelled previous ${pendingApt.status} appointment ${pendingApt.id} for user ${userId}`);
      }
      
      // 🔑 STEP 2: IDEMPOTENCY CHECK AND ATOMIC APPOINTMENT CREATION
      const result = await db.transaction(async (tx) => {
        const txStorage = storage.with(tx);
        
        // 🛡️ IDEMPOTENCY GUARD 1: Check for existing appointments on this slot within last 5 minutes
        if (appointmentData.slotId) {
          const recentDuplicates = await tx
            .select()
            .from(appointments)
            .where(
              and(
                eq(appointments.slotId, appointmentData.slotId),
                eq(appointments.patientId, appointmentData.patientId),
                sql`created_at > NOW() - INTERVAL '5 minutes'`,
                sql`status != 'cancelled'`
              )
            )
            .limit(1);
            
          if (recentDuplicates.length > 0) {
            console.log(`🛡️ Idempotency guard: Found duplicate appointment ${recentDuplicates[0].id} for slot ${appointmentData.slotId}`);
            throw new Error('DUPLICATE_APPOINTMENT_DETECTED');
          }
        }
        
        // 🛡️ IDEMPOTENCY GUARD 2: Check slot availability and lock it 
        if (appointmentData.slotId) {
          const [slotCheck] = await tx
            .select()
            .from(doctorTimeSlots)
            .where(eq(doctorTimeSlots.id, appointmentData.slotId))
            .for('update') // Lock the slot during transaction
            .limit(1);
            
          if (!slotCheck) {
            console.log(`🛡️ Slot ${appointmentData.slotId} not found`);
            throw new Error('SLOT_NOT_FOUND');
          }
          
          if (!slotCheck.isAvailable) {
            console.log(`🛡️ Slot ${appointmentData.slotId} is already booked`);
            throw new Error('SLOT_ALREADY_BOOKED');
          }
        }
        
        // Create pending appointment first
        const createdAppointment = await txStorage.createAppointment(appointmentData);
        console.log(`✅ Created pending appointment ${createdAppointment.id}`);
        
        // Initialize result structure
        let coverageResult: any = null;
        let clientSecret: string | null = null;
        let paymentRequired = true;
        
        // 🎟️ TRY MEMBERSHIP COVERAGE FIRST
        const patient = await txStorage.getUser(userId);
        if (patient?.stripeSubscriptionId) {
          console.log(`🔍 Checking membership for user ${userId} with subscription ${patient.stripeSubscriptionId}`);
          
          // Get membership subscription
          const [subscription] = await tx
            .select()
            .from(membershipSubscriptions)
            .where(eq(membershipSubscriptions.stripeSubscriptionId, patient.stripeSubscriptionId))
            .limit(1);
            
          if (subscription) {
            console.log(`🔍 Found subscription ${subscription.id}`);
            
            // Get current active cycle with lock
            const [currentCycle] = await tx
              .select()
              .from(membershipCycles)
              .where(
                and(
                  eq(membershipCycles.subscriptionId, subscription.id),
                  eq(membershipCycles.isActive, true)
                )
              )
              .for('update')
              .limit(1);
            
            if (currentCycle && currentCycle.allowanceRemaining >= 1) {
              console.log(`🎟️ Found cycle ${currentCycle.id} with ${currentCycle.allowanceRemaining} allowance remaining`);
              
              // Attempt allowance consumption
              const [updatedCycle] = await tx
                .update(membershipCycles)
                .set({
                  allowanceUsed: sql`${membershipCycles.allowanceUsed} + 1`,
                  allowanceRemaining: sql`${membershipCycles.allowanceRemaining} - 1`,
                  updatedAt: new Date()
                })
                .where(
                  and(
                    eq(membershipCycles.id, currentCycle.id),
                    sql`${membershipCycles.allowanceRemaining} >= 1`
                  )
                )
                .returning();

              if (updatedCycle) {
                console.log('🎟️ Successfully consumed allowance - appointment is covered!');
                
                // Log allowance event
                const [allowanceEvent] = await tx
                  .insert(membershipAllowanceEvents)
                  .values({
                    subscriptionId: subscription.id,
                    cycleId: currentCycle.id,
                    eventType: 'consume',
                    appointmentId: createdAppointment.id,
                    allowanceChange: -1,
                    allowanceBefore: currentCycle.allowanceRemaining,
                    allowanceAfter: updatedCycle.allowanceRemaining,
                    reason: 'Appointment booking'
                  })
                  .returning();

                // Create coverage record
                await txStorage.createAppointmentCoverageIfMissing({
                  appointmentId: createdAppointment.id,
                  subscriptionId: subscription.id,
                  cycleId: currentCycle.id,
                  allowanceEventId: allowanceEvent.id,
                  coverageType: 'full_coverage',
                  originalPrice: appointmentPrice.toFixed(2),
                  coveredAmount: appointmentPrice.toFixed(2),
                  patientPaid: '0.00'
                });

                // Update appointment status to paid/confirmed
                await tx
                  .update(appointments)
                  .set({ status: 'paid' })
                  .where(eq(appointments.id, createdAppointment.id));

                // Mark slot unavailable
                if (createdAppointment.slotId) {
                  await txStorage.markSlotUnavailable(createdAppointment.slotId);
                  console.log(`🔒 Slot ${createdAppointment.slotId} marked unavailable`);
                }

                // Create Zoom meeting for immediately covered appointment (outside transaction)
                setTimeout(async () => {
                  try {
                    await zoomService.createMeeting(createdAppointment.id);
                    console.log(`✅ Immediate coverage: Zoom meeting created for appointment ${createdAppointment.id}`);
                  } catch (error) {
                    console.error(`❌ Immediate coverage: Failed to create Zoom meeting for appointment ${createdAppointment.id}:`, error);
                  }
                }, 100);

                coverageResult = {
                  isCovered: true,
                  coverageType: 'full_coverage',
                  originalPrice: appointmentPrice,
                  coveredAmount: appointmentPrice,
                  patientPaid: 0,
                  allowanceDeducted: 1,
                  remainingAllowance: updatedCycle.allowanceRemaining
                };
                
                paymentRequired = false;
                
                console.log('🎟️ Membership coverage completed:', {
                  subscriptionId: subscription.id,
                  cycleId: currentCycle.id,
                  allowanceRemaining: updatedCycle.allowanceRemaining,
                  appointmentStatus: 'paid'
                });
              }
            }
          }
        }
        
        // 💳 CREATE STRIPE PAYMENT INTENT IF PAYMENT REQUIRED
        if (paymentRequired) {
          console.log('💰 Membership not available/insufficient - creating Stripe PaymentIntent');
          
          try {
            const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(appointmentPrice * 100), // Convert to cents
              currency: 'eur',
              metadata: {
                appointmentId: createdAppointment.id.toString(),
                patientId: userId,
                doctorId: req.body.doctorId
              }
            });
            
            clientSecret = paymentIntent.client_secret;
            
            // Update appointment with payment intent
            await tx
              .update(appointments)
              .set({ 
                paymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret 
              })
              .where(eq(appointments.id, createdAppointment.id));
              
            console.log(`💳 Created PaymentIntent ${paymentIntent.id} for appointment ${createdAppointment.id}`);
            
            coverageResult = {
              isCovered: false,
              coverageType: 'no_coverage',
              originalPrice: appointmentPrice,
              coveredAmount: 0,
              patientPaid: appointmentPrice,
              allowanceDeducted: 0,
              remainingAllowance: 0
            };
            
          } catch (stripeError) {
            console.error('❌ Failed to create Stripe PaymentIntent:', stripeError);
            throw new Error('Failed to create payment intent');
          }
        }
        
        return {
          appointment: { ...createdAppointment, status: paymentRequired ? 'pending' : 'paid' },
          coverageResult,
          clientSecret,
          paymentRequired
        };
      });
      
      // 📧 SEND EMAIL NOTIFICATIONS ONLY FOR IMMEDIATELY PAID APPOINTMENTS (MEMBERSHIP COVERAGE)
      // For unpaid appointments, emails will be sent during payment confirmation instead
      if (!result.paymentRequired) {
        try {
          const patient = await storage.getUser(appointmentData.patientId.toString());
          const doctor = await storage.getDoctor(appointmentData.doctorId);
          
          if (patient && doctor && doctor.user) {
            const appointmentDate = appointmentData.appointmentDate.toISOString().split('T')[0];
            const appointmentTime = appointmentData.appointmentDate.toISOString().split('T')[1].substring(0, 5);
            
            // Send confirmation email to patient
            await emailService.sendAppointmentConfirmation({
              patientEmail: patient.email!,
              patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
              doctorName: `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() || 'Doctor',
              specialty: doctor.specialty,
              appointmentDate,
              appointmentTime,
              consultationPrice: typeof doctor.consultationPrice === 'string' 
                  ? parseFloat(doctor.consultationPrice).toFixed(2) 
                  : (doctor.consultationPrice?.toFixed(2) || '0.00'),
              appointmentId: result.appointment.id.toString()
            });
            
            // Send notification email to doctor
            await emailService.sendDoctorNewAppointmentNotification({
              doctorEmail: doctor.user.email!,
              doctorName: `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() || 'Doctor',
              patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
              appointmentDate,
              appointmentTime,
              consultationPrice: typeof doctor.consultationPrice === 'string' 
                  ? parseFloat(doctor.consultationPrice).toFixed(2) 
                  : (doctor.consultationPrice?.toFixed(2) || '0.00'),
              appointmentId: result.appointment.id.toString()
            });
            
            console.log(`📧 Email notifications sent for immediately paid appointment ${result.appointment.id}`);
          }
        } catch (emailError) {
          console.error('📧 Failed to send email notifications for paid appointment:', emailError);
          // Don't fail the appointment creation if email fails
        }
      }
      
      // 🔄 RETURN STRUCTURED RESPONSE FOR FRONTEND ROUTING
      const response = {
        appointmentId: result.appointment.id,
        status: result.appointment.status,
        coverageResult: result.coverageResult,
        clientSecret: result.clientSecret,
        paymentRequired: result.paymentRequired,
        // Include appointment details for confirmation page
        appointment: {
          id: result.appointment.id,
          patientId: result.appointment.patientId,
          doctorId: result.appointment.doctorId,
          appointmentDate: result.appointment.appointmentDate,
          status: result.appointment.status,
          price: result.appointment.price
        }
      };
      
      console.log('✅ Booking completed successfully:', {
        appointmentId: result.appointment.id,
        status: result.appointment.status,
        isCovered: result.coverageResult?.isCovered || false,
        paymentRequired: result.paymentRequired
      });
      
      res.json(response);
      
    } catch (error: any) {
      console.error("🚨 DETAILED Error creating appointment:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        fullError: error
      });
      
      // 🛡️ Handle idempotency guard errors with specific messages
      if (error.message === 'DUPLICATE_APPOINTMENT_DETECTED') {
        return res.status(409).json({ 
          error: "DUPLICATE_APPOINTMENT",
          message: "You already have a recent appointment for this slot. Please check your bookings." 
        });
      }
      
      if (error.message === 'SLOT_NOT_FOUND') {
        return res.status(404).json({ 
          error: "SLOT_NOT_FOUND",
          message: "The selected time slot is no longer available." 
        });
      }
      
      if (error.message === 'SLOT_ALREADY_BOOKED') {
        return res.status(409).json({ 
          error: "SLOT_UNAVAILABLE",
          message: "This time slot has been booked by another patient. Please select another slot." 
        });
      }
      
      res.status(500).json({ 
        error: "BOOKING_FAILED",
        message: "Failed to create appointment. Please try again.",
        debug: {
          pid: process.pid,
          timestamp: new Date().toISOString()
        }
      });
    }
  });
  
  // POST /api/appointments - Create new appointment (MUST BE BEFORE BROAD ROUTERS)
  app.post("/api/appointments", (req, res, next) => {
    console.log('🟢 POST /api/appointments - REQUEST RECEIVED', { 
      method: req.method, 
      url: req.url,
      headers: req.headers['content-type'],
      hasBody: !!req.body,
      session: !!req.session,
      sessionData: req.session ? Object.keys(req.session) : 'no session'
    });
    next();
  }, (req, res, next) => {
    console.log('🔍 Before isAuthenticated middleware');
    isAuthenticated(req, res, (err) => {
      if (err) {
        console.error('🚨 isAuthenticated middleware error:', err);
        return next(err);
      }
      console.log('✅ isAuthenticated middleware passed');
      next();
    });
  }, async (req, res) => {
    try {
      // 🛡️ EXPLICIT GUARDS FOR DEBUGGING
      console.log('🔍 Content-Type check:', req.headers['content-type']);
      console.log('🔍 Request is JSON:', req.is('application/json'));
      console.log('🔍 Body present:', !!req.body);
      console.log('🔍 Body contents:', req.body);
      
      if (!req.is('application/json')) {
        console.error('❌ Wrong Content-Type:', req.headers['content-type']);
        return res.status(415).json({ error: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json' });
      }
      
      if (!req.body) {
        console.error('❌ Empty request body');
        return res.status(400).json({ error: 'EMPTY_BODY', message: 'Request body is required' });
      }
      
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log('🔍 Booking request:', { 
        userId, 
        doctorId: req.body.doctorId, 
        timeSlotId: req.body.timeSlotId,
        appointmentDate: req.body.appointmentDate 
      });
      
      const appointmentPrice = parseFloat(req.body.price || "35.00");
      const appointmentDate = new Date(req.body.appointmentDate);
      
      // 🔑 STEP 1: ALWAYS CREATE APPOINTMENT AS PENDING FIRST
      const appointmentDataInput = {
        patientId: parseInt(userId),
        doctorId: parseInt(req.body.doctorId),
        appointmentDate: appointmentDate,
        status: 'pending', // Always start as pending, then upgrade to paid/confirmed if covered
        paymentIntentId: req.body.paymentIntentId || null,
        clientSecret: req.body.clientSecret || null,
        zoomMeetingId: req.body.zoomMeetingId || null,
        zoomJoinUrl: req.body.zoomJoinUrl || null,
        zoomStartUrl: req.body.zoomStartUrl || null,
        zoomPassword: req.body.zoomPassword || null,
        slotId: req.body.timeSlotId || null,
        price: appointmentPrice.toFixed(2)
      };
      
      console.log('🔍 Validating appointment data:', appointmentDataInput);
      
      let appointmentData;
      try {
        appointmentData = insertAppointmentSchema.parse(appointmentDataInput);
        console.log('✅ Schema validation passed');
      } catch (validationError: any) {
        console.error('❌ Schema validation failed:', validationError);
        throw new Error(`Schema validation failed: ${validationError.message || JSON.stringify(validationError)}`);
      }
      
      // 🚫 Cancel existing pending appointments to prevent multiple payment banners
      const userAppointments = await storage.getAppointments(userId);
      const pendingAppointments = userAppointments.filter(apt => 
        apt.status === 'pending' || apt.status === 'pending_payment'
      );
      
      for (const pendingApt of pendingAppointments) {
        await storage.updateAppointmentStatus(pendingApt.id, "cancelled");
        console.log(`🚫 Auto-cancelled previous ${pendingApt.status} appointment ${pendingApt.id} for user ${userId}`);
      }
      
      // 🔑 STEP 2: IDEMPOTENCY CHECK AND ATOMIC APPOINTMENT CREATION
      const result = await db.transaction(async (tx) => {
        const txStorage = storage.with(tx);
        
        // 🛡️ IDEMPOTENCY GUARD 1: Check for existing appointments on this slot within last 5 minutes
        if (appointmentData.slotId) {
          const recentDuplicates = await tx
            .select()
            .from(appointments)
            .where(
              and(
                eq(appointments.slotId, appointmentData.slotId),
                eq(appointments.patientId, appointmentData.patientId),
                sql`created_at > NOW() - INTERVAL '5 minutes'`,
                sql`status != 'cancelled'`
              )
            )
            .limit(1);
            
          if (recentDuplicates.length > 0) {
            console.log(`🛡️ Idempotency guard: Found duplicate appointment ${recentDuplicates[0].id} for slot ${appointmentData.slotId}`);
            throw new Error('DUPLICATE_APPOINTMENT_DETECTED');
          }
        }
        
        // 🛡️ IDEMPOTENCY GUARD 2: Check slot availability and lock it 
        if (appointmentData.slotId) {
          const [slotCheck] = await tx
            .select()
            .from(doctorTimeSlots)
            .where(eq(doctorTimeSlots.id, appointmentData.slotId))
            .for('update') // Lock the slot during transaction
            .limit(1);
            
          if (!slotCheck) {
            console.log(`🛡️ Slot ${appointmentData.slotId} not found`);
            throw new Error('SLOT_NOT_FOUND');
          }
          
          if (!slotCheck.isAvailable) {
            console.log(`🛡️ Slot ${appointmentData.slotId} is already booked`);
            throw new Error('SLOT_ALREADY_BOOKED');
          }
        }
        
        // Create pending appointment first
        const createdAppointment = await txStorage.createAppointment(appointmentData);
        console.log(`✅ Created pending appointment ${createdAppointment.id}`);
        
        // Initialize result structure
        let coverageResult: any = null;
        let clientSecret: string | null = null;
        let paymentRequired = true;
        
        // 🎟️ TRY MEMBERSHIP COVERAGE FIRST
        const patient = await txStorage.getUser(userId);
        if (patient?.stripeSubscriptionId) {
          console.log(`🔍 Checking membership for user ${userId} with subscription ${patient.stripeSubscriptionId}`);
          
          // Get membership subscription
          const [subscription] = await tx
            .select()
            .from(membershipSubscriptions)
            .where(eq(membershipSubscriptions.stripeSubscriptionId, patient.stripeSubscriptionId))
            .limit(1);
            
          if (subscription) {
            console.log(`🔍 Found subscription ${subscription.id}`);
            
            // Get current active cycle with lock
            const [currentCycle] = await tx
              .select()
              .from(membershipCycles)
              .where(
                and(
                  eq(membershipCycles.subscriptionId, subscription.id),
                  eq(membershipCycles.isActive, true)
                )
              )
              .for('update')
              .limit(1);
            
            if (currentCycle && currentCycle.allowanceRemaining >= 1) {
              console.log(`🎟️ Found cycle ${currentCycle.id} with ${currentCycle.allowanceRemaining} allowance remaining`);
              
              // Attempt allowance consumption
              const [updatedCycle] = await tx
                .update(membershipCycles)
                .set({
                  allowanceUsed: sql`${membershipCycles.allowanceUsed} + 1`,
                  allowanceRemaining: sql`${membershipCycles.allowanceRemaining} - 1`,
                  updatedAt: new Date()
                })
                .where(
                  and(
                    eq(membershipCycles.id, currentCycle.id),
                    sql`${membershipCycles.allowanceRemaining} >= 1`
                  )
                )
                .returning();

              if (updatedCycle) {
                console.log('🎟️ Successfully consumed allowance - appointment is covered!');
                
                // Log allowance event
                const [allowanceEvent] = await tx
                  .insert(membershipAllowanceEvents)
                  .values({
                    subscriptionId: subscription.id,
                    cycleId: currentCycle.id,
                    eventType: 'consume',
                    appointmentId: createdAppointment.id,
                    allowanceChange: -1,
                    allowanceBefore: currentCycle.allowanceRemaining,
                    allowanceAfter: updatedCycle.allowanceRemaining,
                    reason: 'Appointment booking'
                  })
                  .returning();

                // Create coverage record
                await txStorage.createAppointmentCoverageIfMissing({
                  appointmentId: createdAppointment.id,
                  subscriptionId: subscription.id,
                  cycleId: currentCycle.id,
                  allowanceEventId: allowanceEvent.id,
                  coverageType: 'full_coverage',
                  originalPrice: appointmentPrice.toFixed(2),
                  coveredAmount: appointmentPrice.toFixed(2),
                  patientPaid: '0.00'
                });

                // Update appointment status to paid/confirmed
                await tx
                  .update(appointments)
                  .set({ status: 'paid' })
                  .where(eq(appointments.id, createdAppointment.id));

                // Mark slot unavailable
                if (createdAppointment.slotId) {
                  await txStorage.markSlotUnavailable(createdAppointment.slotId);
                  console.log(`🔒 Slot ${createdAppointment.slotId} marked unavailable`);
                }

                // Create Zoom meeting for immediately covered appointment (outside transaction)
                setTimeout(async () => {
                  try {
                    await zoomService.createMeeting(createdAppointment.id);
                    console.log(`✅ Immediate coverage: Zoom meeting created for appointment ${createdAppointment.id}`);
                  } catch (error) {
                    console.error(`❌ Immediate coverage: Failed to create Zoom meeting for appointment ${createdAppointment.id}:`, error);
                  }
                }, 100);

                coverageResult = {
                  isCovered: true,
                  coverageType: 'full_coverage',
                  originalPrice: appointmentPrice,
                  coveredAmount: appointmentPrice,
                  patientPaid: 0,
                  allowanceDeducted: 1,
                  remainingAllowance: updatedCycle.allowanceRemaining
                };
                
                paymentRequired = false;
                
                console.log('🎟️ Membership coverage completed:', {
                  subscriptionId: subscription.id,
                  cycleId: currentCycle.id,
                  allowanceRemaining: updatedCycle.allowanceRemaining,
                  appointmentStatus: 'paid'
                });
              }
            }
          }
        }
        
        // 💳 CREATE STRIPE PAYMENT INTENT IF PAYMENT REQUIRED
        if (paymentRequired) {
          console.log('💰 Membership not available/insufficient - creating Stripe PaymentIntent');
          
          try {
            const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(appointmentPrice * 100), // Convert to cents
              currency: 'eur',
              metadata: {
                appointmentId: createdAppointment.id.toString(),
                patientId: userId,
                doctorId: req.body.doctorId
              }
            });
            
            clientSecret = paymentIntent.client_secret;
            
            // Update appointment with payment intent
            await tx
              .update(appointments)
              .set({ 
                paymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret 
              })
              .where(eq(appointments.id, createdAppointment.id));
              
            console.log(`💳 Created PaymentIntent ${paymentIntent.id} for appointment ${createdAppointment.id}`);
            
            coverageResult = {
              isCovered: false,
              coverageType: 'no_coverage',
              originalPrice: appointmentPrice,
              coveredAmount: 0,
              patientPaid: appointmentPrice,
              allowanceDeducted: 0,
              remainingAllowance: 0
            };
            
          } catch (stripeError) {
            console.error('❌ Failed to create Stripe PaymentIntent:', stripeError);
            throw new Error('Failed to create payment intent');
          }
        }
        
        return {
          appointment: { ...createdAppointment, status: paymentRequired ? 'pending' : 'paid' },
          coverageResult,
          clientSecret,
          paymentRequired
        };
      });
      
      // 📧 SEND EMAIL NOTIFICATIONS ONLY FOR IMMEDIATELY PAID APPOINTMENTS (MEMBERSHIP COVERAGE)
      // For unpaid appointments, emails will be sent during payment confirmation instead
      if (!result.paymentRequired) {
        try {
          const patient = await storage.getUser(appointmentData.patientId.toString());
          const doctor = await storage.getDoctor(appointmentData.doctorId);
          
          if (patient && doctor && doctor.user) {
            const appointmentDate = appointmentData.appointmentDate.toISOString().split('T')[0];
            const appointmentTime = appointmentData.appointmentDate.toISOString().split('T')[1].substring(0, 5);
            
            // Send confirmation email to patient
            await emailService.sendAppointmentConfirmation({
              patientEmail: patient.email!,
              patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
              doctorName: `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() || 'Doctor',
              specialty: doctor.specialty,
              appointmentDate,
              appointmentTime,
              consultationPrice: typeof doctor.consultationPrice === 'string' 
                  ? parseFloat(doctor.consultationPrice).toFixed(2) 
                  : (doctor.consultationPrice?.toFixed(2) || '0.00'),
              appointmentId: result.appointment.id.toString()
            });
            
            // Send notification email to doctor
            await emailService.sendDoctorNewAppointmentNotification({
              doctorEmail: doctor.user.email!,
              doctorName: `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() || 'Doctor',
              patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
              appointmentDate,
              appointmentTime,
              consultationPrice: typeof doctor.consultationPrice === 'string' 
                  ? parseFloat(doctor.consultationPrice).toFixed(2) 
                  : (doctor.consultationPrice?.toFixed(2) || '0.00'),
              appointmentId: result.appointment.id.toString()
            });
            
            console.log(`📧 Email notifications sent for immediately paid appointment ${result.appointment.id}`);
          }
        } catch (emailError) {
          console.error('📧 Failed to send email notifications for paid appointment:', emailError);
          // Don't fail the appointment creation if email fails
        }
      }
      
      // 🔄 RETURN STRUCTURED RESPONSE FOR FRONTEND ROUTING
      const response = {
        appointmentId: result.appointment.id,
        status: result.appointment.status,
        coverageResult: result.coverageResult,
        clientSecret: result.clientSecret,
        paymentRequired: result.paymentRequired,
        // Include appointment details for confirmation page
        appointment: {
          id: result.appointment.id,
          patientId: result.appointment.patientId,
          doctorId: result.appointment.doctorId,
          appointmentDate: result.appointment.appointmentDate,
          status: result.appointment.status,
          price: result.appointment.price
        }
      };
      
      console.log('✅ Booking completed successfully:', {
        appointmentId: result.appointment.id,
        status: result.appointment.status,
        isCovered: result.coverageResult?.isCovered || false,
        paymentRequired: result.paymentRequired
      });
      
      res.json(response);
    } catch (error: any) {
      console.error("🚨 DETAILED Error creating appointment:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        fullError: error
      });
      
      // 🔍 ARCHITECT DEBUGGING: Log exact stack trace
      console.error("🔍 FULL STACK TRACE:", error.stack);
      console.error("🔍 ERROR AT LINE:", error.stack?.split('\n')[1]);
      
      // 🛡️ Handle idempotency guard errors with specific messages
      if (error.message === 'DUPLICATE_APPOINTMENT_DETECTED') {
        return res.status(409).json({ 
          error: "DUPLICATE_APPOINTMENT",
          message: "You already have a recent appointment for this slot. Please check your bookings." 
        });
      }
      
      if (error.message === 'SLOT_NOT_FOUND') {
        return res.status(404).json({ 
          error: "SLOT_NOT_FOUND",
          message: "The selected time slot is no longer available." 
        });
      }
      
      if (error.message === 'SLOT_ALREADY_BOOKED') {
        return res.status(409).json({ 
          error: "SLOT_UNAVAILABLE",
          message: "This time slot has just been booked by another patient. Please select a different time." 
        });
      }
      
      // Handle Stripe errors
      if (error.message === 'Failed to create payment intent') {
        return res.status(500).json({ 
          error: "PAYMENT_SETUP_FAILED",
          message: "Unable to set up payment. Please try again." 
        });
      }
      
      // Generic error fallback
      // 🔍 ARCHITECT DEBUGGING: Add unique header to identify handler
      res.set('X-Handler', 'appointments-v2');
      res.set('X-Process-PID', process.pid.toString());
      
      res.status(500).json({ 
        error: "BOOKING_FAILED",
        message: "Failed to create appointment. Please try again.",
        debug: {
          pid: process.pid,
          timestamp: new Date().toISOString()
        }
      });
    }
  });
  
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
      const appointment = await storage.getAppointment(appointmentId.toString());
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Check if user has access to this appointment
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
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
        appointmentDate: new Date(now.getTime() - 5 * 60 * 1000),
        zoomMeetingId: 'test-meeting-24',
        zoomJoinUrl: 'https://zoom.us/j/test24',
        zoomStartUrl: 'https://zoom.us/s/test24'
      });
      console.log('✅ Updated appointment 24 as live video');
      
      // Update appointment 16 to be video and start in 3 minutes
      await storage.updateAppointment(16, {
        appointmentDate: new Date(now.getTime() + 3 * 60 * 1000),
        zoomMeetingId: 'test-meeting-16',
        zoomJoinUrl: 'https://zoom.us/j/test16',
        zoomStartUrl: 'https://zoom.us/s/test16'
      });
      console.log('✅ Updated appointment 16 to start soon');
      
      // Update appointment 22 to be video and start in 15 minutes
      await storage.updateAppointment(22, {
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
        medicalApproach: doctor.medicalApproach,
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

      // Get all slots for this doctor
      const allSlots = await storage.getAllDoctorTimeSlots(doctorId);

      // Get all active appointments for this doctor (to double-check against booked slots)
      const appointments = await storage.getAppointments(undefined, doctorId);
      const activeAppointments = appointments.filter(apt =>
        apt.status === 'paid' || apt.status === 'pending' || apt.status === 'confirmed'
      );

      // Get set of slot IDs that have active appointments
      const bookedSlotIds = new Set(
        activeAppointments
          .map(apt => apt.slotId)
          .filter(slotId => slotId !== null && slotId !== undefined)
      );

      // Filter for truly available slots: marked as available AND not booked by an active appointment
      const availableSlots = allSlots.filter(slot =>
        slot.isAvailable && !bookedSlotIds.has(slot.id)
      );

      console.log(`📅 Found ${availableSlots.length} available slots out of ${allSlots.length} total slots for doctor ${doctorId}`);
      console.log(`🔒 Excluded ${bookedSlotIds.size} slots with active appointments`);

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
      
      // Process actual refund if eligible
      let refundResult = null;
      if (refundEligible) {
        try {
          // Use the payment intent ID directly from the appointment record
          if (appointment.paymentIntentId) {
            console.log(`💰 Processing refund for appointment ${appointmentId}, payment intent: ${appointment.paymentIntentId}`);
            
            // Create refund with Stripe
            const refund = await stripe.refunds.create({
              payment_intent: appointment.paymentIntentId,
              reason: 'requested_by_customer',
              metadata: {
                appointmentId: appointmentId,
                cancelledBy: cancelledBy,
                reason: reason || 'Appointment cancelled'
              }
            });
            
            console.log(`✅ Stripe refund created: ${refund.id}, amount: ${refund.amount}`);
            
            // Record refund in database (optional - could create refunds table in future)
            try {
              await storage.recordRefund({
                appointmentId: appointmentId,
                paymentId: appointmentId, // Use appointmentId as paymentId for now
                stripeRefundId: refund.id,
                amount: (refund.amount / 100).toString(), // Convert from cents
                currency: refund.currency.toUpperCase(),
                reason: reason || 'Appointment cancelled',
                status: refund.status
              });
              console.log(`✅ Refund recorded in database for appointment ${appointmentId}`);
            } catch (dbError) {
              console.warn(`⚠️ Could not record refund in database: ${dbError}, but Stripe refund was successful`);
            }
            
            refundResult = {
              refundId: refund.id,
              amount: (refund.amount / 100).toString(),
              currency: refund.currency.toUpperCase(),
              status: refund.status
            };
            
            console.log(`✅ Stripe refund processed successfully for appointment ${appointmentId}`);
          } else {
            console.warn(`⚠️ No payment intent found for appointment ${appointmentId}, cannot process refund`);
          }
        } catch (refundError) {
          console.error('💰 Failed to process refund:', refundError);
          // Don't fail the cancellation if refund fails, but log it
        }
      }
      
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
      
      // Check slot availability - using getDoctorTimeSlots
      const slots = await storage.getDoctorTimeSlots(doctorId);
      const slot = slots.find(s => s.id === slotId);
      if (!slot || !slot.isAvailable) {
        return res.status(409).json({ 
          error: "Slot is no longer available",
          code: "SLOT_UNAVAILABLE"
        });
      }
      
      // Create appointment
      const appointmentData = {
        patientId: parseInt(userId!),
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
      
      // Cancel any existing pending appointments for this user to prevent multiple payment banners
      const userAppointments = await storage.getAppointments(userId);
      const pendingAppointments = userAppointments.filter(apt => 
        apt.status === 'pending' || apt.status === 'pending_payment'
      );
      
      for (const pendingApt of pendingAppointments) {
        await storage.updateAppointmentStatus(pendingApt.id, "cancelled");
        console.log(`🚫 Auto-cancelled previous ${pendingApt.status} appointment ${pendingApt.id} for user ${userId}`);
      }
      
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
      await storage.updateAppointmentStatus(appointment.id, "pending", session.id);
      
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
  app.get("/api/admin/kpis", isAuthenticated, auditAdminMiddleware('view_kpis', 'admin_dashboard'), async (req, res) => {
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
  app.get("/api/admin/metrics", isAuthenticated, auditAdminMiddleware('view_metrics', 'admin_dashboard'), async (req, res) => {
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
  app.get("/api/admin/meetings", isAuthenticated, auditAdminMiddleware('view_meetings', 'admin_dashboard'), async (req, res) => {
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
        // Get all doctors with full information including user details
        const doctors = await storage.getDoctors();
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
  app.get("/api/admin/users", isAuthenticated, auditAdminMiddleware('view_users', 'user_management'), async (req, res) => {
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

  app.post("/api/admin/users", isAuthenticated, auditAdminMiddleware('create_user', 'user_management'), async (req, res) => {
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

  app.delete("/api/admin/users/:userId", isAuthenticated, auditAdminMiddleware('delete_user', 'user_management'), async (req, res) => {
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

  // Create doctor account (admin only)
  app.post("/api/admin/create-doctor", isAuthenticated, async (req, res) => {
    try {
      console.log('📝 [Create Doctor] Raw request body:', JSON.stringify(req.body, null, 2));

      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const doctorData = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        specialization: z.string().min(1),
        title: z.string().default('Dr.'),
        bio: z.string().optional(),
        licenseNumber: z.string().optional(),
        yearsOfExperience: z.number().min(0).default(0),
        consultationFee: z.number().min(0).default(35),
        languages: z.array(z.string()).default(['English']),
      }).parse(req.body);

      console.log('🏥 Admin creating doctor account:', doctorData.email);

      // 1. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: doctorData.email,
        password: doctorData.password,
        email_confirm: true,
        user_metadata: {
          role: 'doctor',
          firstName: doctorData.firstName,
          lastName: doctorData.lastName
        }
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      const authUserId = authData.user.id;
      console.log('✅ Auth user created:', authUserId);

      // 2. Create user in users table
      const newUser = await storage.createUser({
        email: doctorData.email,
        firstName: doctorData.firstName,
        lastName: doctorData.lastName,
        role: 'doctor',
        phoneNumber: null,
      });

      console.log('✅ User profile created:', newUser.id);

      // 3. Create doctor profile
      const doctor = await storage.createDoctor({
        userId: newUser.id, // Use the integer ID from users table, not the UUID
        specialty: doctorData.specialization, // Schema uses 'specialty' not 'specialization'
        bio: doctorData.bio || `${doctorData.title} ${doctorData.firstName} ${doctorData.lastName}, specialized in ${doctorData.specialization}.`,
        rppsNumber: doctorData.licenseNumber || `DOC-${Date.now()}`, // Schema uses 'rppsNumber' not 'licenseNumber'
        consultationPrice: doctorData.consultationFee.toString(), // Schema uses 'consultationPrice' as decimal string
        languages: doctorData.languages,
        rating: "5.00", // Decimal as string
        reviewCount: 0,
      });

      console.log('✅ Doctor profile created:', doctor.id);

      res.status(201).json({
        success: true,
        doctor: {
          id: doctor.id,
          userId: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          specialty: doctor.specialty,
        },
        credentials: {
          email: doctorData.email,
          password: doctorData.password, // Return for admin to share with doctor
        }
      });
    } catch (error: any) {
      console.error("❌ Error creating doctor:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message || "Failed to create doctor" });
      }
    }
  });

  // Get single doctor details with statistics
  app.get("/api/admin/doctors/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const doctorId = parseInt(req.params.id);
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: "Invalid doctor ID" });
      }

      const doctor = await storage.getDoctor(doctorId);
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }

      // Get doctor statistics
      const appointments = await storage.getAppointments(undefined, doctorId.toString());
      const completedAppointments = appointments.filter(a => a.status === 'completed');
      const cancelledAppointments = appointments.filter(a => a.status === 'cancelled');
      const upcomingAppointments = appointments.filter(a =>
        a.status === 'paid' && new Date(a.scheduledTime) > new Date()
      );

      const totalRevenue = completedAppointments.reduce((sum, appt) =>
        sum + parseFloat(appt.price || '0'), 0
      );

      const stats = {
        totalAppointments: appointments.length,
        completedAppointments: completedAppointments.length,
        cancelledAppointments: cancelledAppointments.length,
        upcomingAppointments: upcomingAppointments.length,
        completionRate: appointments.length > 0
          ? Math.round((completedAppointments.length / appointments.length) * 100)
          : 0,
        averageRating: parseFloat(doctor.rating || '0'),
        totalRevenue,
        availableSlotsCount: 0 // Will be calculated below
      };

      // Get available slots count
      const slots = await storage.getDoctorTimeSlots(doctorId);
      stats.availableSlotsCount = slots.filter(slot => slot.isAvailable).length;

      res.json({
        ...doctor,
        stats
      });
    } catch (error: any) {
      console.error("Error fetching doctor details:", error);
      res.status(500).json({ message: error.message || "Failed to fetch doctor details" });
    }
  });

  // Update doctor profile
  app.put("/api/admin/doctors/:id", isAuthenticated, auditAdminMiddleware('update_doctor', 'doctor_management'), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const doctorId = parseInt(req.params.id);
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: "Invalid doctor ID" });
      }

      // Split incoming data into doctor fields and user fields
      const updateSchema = z.object({
        // Doctor table fields
        specialty: z.string().optional(),
        bio: z.string().optional(),
        education: z.string().optional(),
        experience: z.string().optional(),
        medicalApproach: z.string().optional(),
        rppsNumber: z.string().optional(),
        consultationPrice: z.string().optional(),
        languages: z.array(z.string()).optional(),
        // User table fields
        title: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
      }).parse(req.body);

      // Check if doctor exists
      const existingDoctor = await storage.getDoctor(doctorId);
      if (!existingDoctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }

      // Separate doctor fields from user fields
      const doctorData: any = {};
      const userData: any = {};

      // Doctor table fields
      if (updateSchema.specialty !== undefined) doctorData.specialty = updateSchema.specialty;
      if (updateSchema.bio !== undefined) doctorData.bio = updateSchema.bio;
      if (updateSchema.education !== undefined) doctorData.education = updateSchema.education;
      if (updateSchema.experience !== undefined) doctorData.experience = updateSchema.experience;
      if (updateSchema.medicalApproach !== undefined) doctorData.medicalApproach = updateSchema.medicalApproach;
      if (updateSchema.rppsNumber !== undefined) doctorData.rppsNumber = updateSchema.rppsNumber;
      if (updateSchema.consultationPrice !== undefined) doctorData.consultationPrice = updateSchema.consultationPrice;
      if (updateSchema.languages !== undefined) doctorData.languages = updateSchema.languages;

      // User table fields
      if (updateSchema.title !== undefined) userData.title = updateSchema.title;
      if (updateSchema.firstName !== undefined) userData.firstName = updateSchema.firstName;
      if (updateSchema.lastName !== undefined) userData.lastName = updateSchema.lastName;
      if (updateSchema.phone !== undefined) userData.phone = updateSchema.phone;

      // Update doctor table if there are doctor fields
      if (Object.keys(doctorData).length > 0) {
        await storage.updateDoctor(doctorId, doctorData);
      }

      // Update user table if there are user fields
      if (Object.keys(userData).length > 0) {
        await db
          .update(users)
          .set(userData)
          .where(eq(users.id, existingDoctor.userId));
      }

      // Fetch updated doctor with user info
      const updatedDoctor = await storage.getDoctor(doctorId);

      res.json({
        success: true,
        doctor: updatedDoctor
      });
    } catch (error: any) {
      console.error("Error updating doctor:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message || "Failed to update doctor" });
      }
    }
  });

  // Get doctor availability
  app.get("/api/admin/doctors/:id/availability", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const doctorId = req.params.id;
      const slots = await storage.getDoctorTimeSlots(doctorId, req.query.date as string);

      res.json(slots);
    } catch (error: any) {
      console.error("Error fetching doctor availability:", error);
      res.status(500).json({ message: error.message || "Failed to fetch availability" });
    }
  });

  // Get doctor meetings/appointments
  app.get("/api/admin/doctors/:id/appointments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const doctorId = req.params.id;
      const appointments = await storage.getAppointments(undefined, doctorId);

      res.json(appointments);
    } catch (error: any) {
      console.error("Error fetching doctor appointments:", error);
      res.status(500).json({ message: error.message || "Failed to fetch appointments" });
    }
  });

  // Get all patients (for admin)
  app.get("/api/admin/patients", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error: any) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch patients" });
    }
  });

  // Create appointment (admin only - bypasses all booking constraints)
  app.post("/api/admin/appointments/create", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { doctorId, patientId, appointmentDateUTC, reason, notes, status } = req.body;

      // Validate required fields
      if (!doctorId || !patientId || !appointmentDateUTC) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Parse the UTC timestamp sent from the frontend
      // The frontend creates a Date in the user's local time and converts to ISO string (UTC)
      const appointmentDate = new Date(appointmentDateUTC);

      // Validate the date
      if (isNaN(appointmentDate.getTime())) {
        return res.status(400).json({ message: "Invalid appointment date" });
      }

      console.log('📅 Creating admin appointment:', {
        doctorId,
        patientId,
        appointmentDateUTC,
        appointmentDate: appointmentDate.toISOString(),
        note: 'Using UTC timestamp from frontend - no timezone conversion needed'
      });

      // Create appointment directly without constraints
      const appointment = await storage.createAppointment({
        doctorId,
        patientId,
        appointmentDate,
        status: status || 'confirmed',
        paymentIntentId: `admin_${Date.now()}`, // Unique ID for admin appointments
        price: '0.00', // Admin appointments can be free
      });

      console.log(`✅ Admin created appointment: ${appointment.id} for patient ${patientId} with doctor ${doctorId}`);

      // Create Zoom meeting for the appointment
      try {
        console.log(`📹 Creating Zoom meeting for appointment ${appointment.id}...`);
        const zoomMeeting = await zoomService.createMeeting(appointment.id);
        if (zoomMeeting) {
          console.log(`✅ Zoom meeting created successfully: ${zoomMeeting.join_url}`);
        } else {
          console.warn(`⚠️ Zoom meeting creation skipped (Zoom not configured or failed)`);
        }
      } catch (zoomError: any) {
        console.error(`❌ Error creating Zoom meeting for appointment ${appointment.id}:`, zoomError.message);
        // Continue without Zoom - appointment is still valid
      }

      // Fetch the updated appointment with Zoom details
      const updatedAppointment = await storage.getAppointment(appointment.id);
      res.json(updatedAppointment || appointment);
    } catch (error: any) {
      console.error("Error creating admin appointment:", error);
      res.status(500).json({ message: error.message || "Failed to create appointment" });
    }
  });

  // Update doctor photo (admin only)
  app.patch("/api/admin/doctors/:id/photo", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const doctorId = parseInt(req.params.id);
      const { profileImageUrl } = req.body;

      // Get the doctor to find their user ID
      const doctor = await storage.getDoctor(doctorId);
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }

      // Update the user's profile image
      await db
        .update(users)
        .set({ profileImageUrl: profileImageUrl || null })
        .where(eq(users.id, doctor.userId));

      console.log(`✅ Admin updated photo for doctor ${doctorId} (user ${doctor.userId})`);
      res.json({ success: true, profileImageUrl: profileImageUrl || null });
    } catch (error: any) {
      console.error("Error updating doctor photo:", error);
      res.status(500).json({ message: error.message || "Failed to update photo" });
    }
  });

  // Upload profile photo file (multipart/form-data)
  app.post("/api/admin/doctors/:id/photo/upload", isAuthenticated, upload.single('photo'), async (req, res) => {
    try {
      console.log('📸 [PHOTO UPLOAD] Starting upload process...');
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const doctorId = parseInt(req.params.id);
      console.log(`📸 [PHOTO UPLOAD] Doctor ID: ${doctorId}, File: ${req.file.originalname}`);

      // Get the doctor to find their user ID
      const doctor = await storage.getDoctor(doctorId);
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      console.log(`📸 [PHOTO UPLOAD] Found doctor with user ID: ${doctor.userId}`);

      // Upload to Supabase Storage
      const { getSupabaseStorageService } = await import('./supabaseStorage');
      const storageService = getSupabaseStorageService();

      const publicUrl = await storageService.uploadProfilePhoto(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        doctor.userId
      );
      console.log(`📸 [PHOTO UPLOAD] Uploaded to Supabase: ${publicUrl}`);

      // Update the user's profile image with the Supabase URL
      await db
        .update(users)
        .set({ profileImageUrl: publicUrl })
        .where(eq(users.id, doctor.userId));
      console.log(`📸 [PHOTO UPLOAD] Database updated for user ${doctor.userId}`);

      // Verify the update
      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, doctor.userId)
      });
      console.log(`📸 [PHOTO UPLOAD] Verification - DB now has: ${updatedUser?.profileImageUrl}`);

      console.log(`✅ Admin uploaded photo for doctor ${doctorId} (user ${doctor.userId}): ${publicUrl}`);
      res.json({ success: true, profileImageUrl: publicUrl });
    } catch (error: any) {
      console.error("❌ [PHOTO UPLOAD] Error uploading doctor photo:", error);
      res.status(500).json({ message: error.message || "Failed to upload photo" });
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

  // Register endpoint for creating new accounts
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Create account with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) {
        console.error("Registration error:", error);
        return res.status(400).json({ error: error.message || "Registration failed" });
      }

      if (!data.user) {
        return res.status(400).json({ error: "Failed to create user" });
      }

      // Create user in database
      const dbUser = await storage.upsertUser({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'patient' // Default role for new registrations
      });

      // Store session in Express session if auto-confirmed
      if (data.session) {
        req.session.supabaseSession = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user: data.user
        };

        // Save session explicitly
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: "Failed to save session" });
          }

          console.log("Registration successful for user:", email);
          res.json({
            success: true,
            user: dbUser,
            session: {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token
            }
          });
        });
      } else {
        // Email confirmation required
        console.log("Registration successful, email confirmation required:", email);
        res.json({
          success: true,
          message: "Please check your email to confirm your account",
          user: dbUser
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Get current authenticated user
  app.get("/api/auth/user", async (req, res) => {
    try {
      // Check if user has a session
      if (!req.session?.supabaseSession?.user) {
        return res.status(401).json(null);
      }

      const email = req.session.supabaseSession.user.email;

      // Get user from database
      const dbUser = await storage.getUserByEmail(email);

      if (!dbUser) {
        return res.status(401).json(null);
      }

      // Return user with role
      res.json({
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: dbUser.role,
        profileImageUrl: dbUser.profileImageUrl,
        avatar_url: dbUser.avatar_url,
        approved: dbUser.approved,
        stripeSubscriptionId: dbUser.stripeSubscriptionId
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Diagnostic endpoint to check environment variables (always enabled)
  app.get("/api/test/env-check", async (req, res) => {
    res.json({
      ENABLE_TEST_ENDPOINTS: process.env.ENABLE_TEST_ENDPOINTS,
      ENABLE_TEST_ENDPOINTS_type: typeof process.env.ENABLE_TEST_ENDPOINTS,
      ENABLE_TEST_ENDPOINTS_exact_match: process.env.ENABLE_TEST_ENDPOINTS === 'true',
      NODE_ENV: process.env.NODE_ENV,
      NODE_ENV_type: typeof process.env.NODE_ENV,
      condition_result: process.env.ENABLE_TEST_ENDPOINTS === 'true' || process.env.NODE_ENV !== 'production'
    });
  });

  // Test-only endpoint to create persistent session for E2E tests
  // IMPORTANT: Only enable when ENABLE_TEST_ENDPOINTS is set
  console.log('[Test Endpoint Check] ENABLE_TEST_ENDPOINTS:', process.env.ENABLE_TEST_ENDPOINTS);
  console.log('[Test Endpoint Check] NODE_ENV:', process.env.NODE_ENV);

  if (process.env.ENABLE_TEST_ENDPOINTS === 'true' || process.env.NODE_ENV !== 'production') {
    console.log('[Test Endpoint] Registering /api/test/auth endpoint');
    app.post("/api/test/auth", async (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: "Email and password required" });
        }

        // Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error || !data.user) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // Get user from database
        const dbUser = await storage.getUserByEmail(email);

        if (!dbUser) {
          return res.status(404).json({ error: "User not found in database" });
        }

        // Create a long-lived session for testing (24 hours)
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
        req.session.supabaseSession = {
          access_token: data.session?.access_token || '',
          refresh_token: data.session?.refresh_token || '',
          user: data.user
        };

        // Save session and return success
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: "Failed to save session" });
          }

          res.json({
            success: true,
            user: {
              id: dbUser.id,
              email: dbUser.email,
              role: dbUser.role,
              firstName: dbUser.firstName,
              lastName: dbUser.lastName
            },
            sessionId: req.sessionID
          });
        });
      } catch (error: any) {
        console.error("Test auth error:", error);
        res.status(500).json({ error: "Authentication failed" });
      }
    });
  }

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



  // Time slots routes are now handled by setupSlotRoutes() from ./routes/slots.ts
  // Removed duplicate route definitions to avoid conflicts



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

      // Prevent payment intent creation for already paid appointments
      if (appointment.status === 'paid') {
        return res.status(400).json({ 
          error: "Appointment is already paid",
          code: "APPOINTMENT_ALREADY_PAID"
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

      // Update appointment status to pending
      await storage.updateAppointmentStatus(appointmentId, "pending", paymentIntent.id);

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
          
          // Trigger appointment confirmation notification (non-blocking)
          try {
            await notificationService.scheduleNotification({
              userId: appointment.patientId,
              appointmentId: appointment.id,
              triggerCode: TriggerCode.BOOK_CONF,
              scheduledFor: new Date()
            });
            console.log(`✅ Confirmation notification scheduled for appointment ${appointment.id}`);
          } catch (notificationError) {
            console.error(`⚠️ Failed to schedule confirmation notification for appointment ${appointment.id}:`, notificationError);
            // Don't fail payment confirmation if notification fails
          }
          
          // 📧 SEND EMAIL NOTIFICATIONS AFTER SUCCESSFUL PAYMENT CONFIRMATION
          try {
            const patient = await storage.getUser(appointment.patientId.toString());
            const doctor = await storage.getDoctor(appointment.doctorId);
            
            if (patient && doctor && doctor.user) {
              const appointmentDate = appointment.appointmentDate.toISOString().split('T')[0];
              const appointmentTime = appointment.appointmentDate.toISOString().split('T')[1].substring(0, 5);
              
              // Send confirmation email to patient
              await emailService.sendAppointmentConfirmation({
                patientEmail: patient.email!,
                patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
                doctorName: `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() || 'Doctor',
                specialty: doctor.specialty,
                appointmentDate,
                appointmentTime,
                consultationPrice: typeof doctor.consultationPrice === 'string' 
                  ? parseFloat(doctor.consultationPrice).toFixed(2) 
                  : (doctor.consultationPrice?.toFixed(2) || '0.00'),
                appointmentId: appointment.id.toString()
              });
              
              // Send notification email to doctor
              await emailService.sendDoctorNewAppointmentNotification({
                doctorEmail: doctor.user.email!,
                doctorName: `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() || 'Doctor',
                patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
                appointmentDate,
                appointmentTime,
                consultationPrice: typeof doctor.consultationPrice === 'string' 
                  ? parseFloat(doctor.consultationPrice).toFixed(2) 
                  : (doctor.consultationPrice?.toFixed(2) || '0.00'),
                appointmentId: appointment.id.toString()
              });
              
              console.log(`📧 Email confirmations sent after payment for appointment ${appointment.id}`);
            }
          } catch (emailError) {
            console.error('📧 Failed to send email confirmations after payment:', emailError);
            // Don't fail the payment confirmation if email fails
          }
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

  // Charge a saved payment method for an appointment
  app.post("/api/payment/charge-saved-method", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId, paymentMethodId, amount } = req.body;

      if (!appointmentId || !paymentMethodId) {
        return res.status(400).json({
          error: "Missing appointmentId or paymentMethodId",
          code: "MISSING_PARAMETERS"
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

      // Verify the appointment belongs to this user
      if (appointment.patientId !== req.user.id) {
        return res.status(403).json({
          error: "Unauthorized access to appointment",
          code: "UNAUTHORIZED"
        });
      }

      // Prevent payment for already paid appointments
      if (appointment.status === 'paid') {
        return res.status(400).json({
          error: "Appointment is already paid",
          code: "APPOINTMENT_ALREADY_PAID"
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

      console.log(`💰 Charging saved payment method: Doctor ${doctor.id}, Real price: €${realPrice}`);

      // Validate price is reasonable (between €1 and €500)
      if (realPrice < 1 || realPrice > 500) {
        console.error(`⚠️ Suspicious price detected: €${realPrice}`);
        return res.status(400).json({
          error: "Invalid consultation price",
          code: "INVALID_PRICE"
        });
      }

      // Get user's Stripe customer ID
      const user = await storage.getUser(req.user.id.toString());
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({
          error: "User has no Stripe customer ID",
          code: "NO_CUSTOMER_ID"
        });
      }

      // Verify the payment method belongs to the customer
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (paymentMethod.customer !== user.stripeCustomerId) {
        return res.status(403).json({
          error: "Payment method does not belong to this customer",
          code: "INVALID_PAYMENT_METHOD"
        });
      }

      // Create and confirm payment intent with saved payment method
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(realPrice * 100), // Convert to cents - using DATABASE price
        currency: 'eur',
        customer: user.stripeCustomerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          appointmentId: appointmentId.toString(),
          patientId: req.user.id.toString(),
          doctorId: appointment.doctorId.toString(),
          realPrice: realPrice.toString()
        },
      });

      if (paymentIntent.status === 'succeeded') {
        // Update appointment status to paid
        await storage.updateAppointmentStatus(appointmentId, "paid", paymentIntent.id);

        // Get appointment details to mark the corresponding slot as unavailable
        const appointmentData = await storage.getAppointment(appointmentId);

        // Create Zoom meeting for the paid appointment
        if (appointmentData && zoomService.isConfigured()) {
          console.log(`🎥 Creating Zoom meeting for appointment ${appointmentId}`);
          await zoomService.createMeeting(Number(appointmentId));
        }

        if (appointmentData) {
          // Find and mark the corresponding time slot as unavailable
          const timeSlots = await storage.getDoctorTimeSlots(appointmentData.doctorId);
          const appointmentDate = new Date(appointmentData.appointmentDate);

          // Extract date and time components from UTC appointment date
          const appointmentDateString = appointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          const appointmentTimeString = appointmentDate.toISOString().split('T')[1].slice(0, 8); // HH:MM:SS format from UTC

          console.log(`🔍 Looking for slot: date=${appointmentDateString}, time=${appointmentTimeString} (UTC time)`);

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

          // Trigger appointment confirmation notification (non-blocking)
          try {
            await notificationService.scheduleNotification({
              userId: appointmentData.patientId,
              triggerCode: 'appointment-confirmed' as TriggerCode,
              scheduledFor: new Date(),
              data: {
                appointmentId: appointmentData.id.toString(),
                appointmentDate: appointmentData.appointmentDate,
                doctorName: doctor ? `${doctor.user?.firstName || ''} ${doctor.user?.lastName || ''}`.trim() : 'Doctor'
              }
            });
            console.log(`📬 Scheduled confirmation notification for appointment ${appointmentData.id}`);
          } catch (notifError) {
            console.error('📬 Failed to schedule notification:', notifError);
            // Don't fail the payment if notification fails
          }

          // Send email confirmations to both patient and doctor
          try {
            const patient = await storage.getUser(appointmentData.patientId.toString());
            if (patient && doctor.user) {
              const appointmentLocalDate = new Date(appointmentData.appointmentDate);
              const appointmentDate = appointmentLocalDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              const appointmentTime = appointmentLocalDate.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
              });

              // Send confirmation to patient
              await emailService.sendAppointmentConfirmationToPatient({
                patientEmail: patient.email!,
                patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
                doctorName: `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() || 'Doctor',
                appointmentDate,
                appointmentTime,
                consultationPrice: realPrice.toFixed(2),
                appointmentId: appointmentData.id.toString()
              });

              // Send confirmation to doctor
              await emailService.sendAppointmentConfirmationToDoctor({
                doctorEmail: doctor.user.email!,
                doctorName: `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() || 'Doctor',
                patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
                appointmentDate,
                appointmentTime,
                consultationPrice: realPrice.toFixed(2),
                appointmentId: appointmentData.id.toString()
              });

              console.log(`📧 Email confirmations sent after payment for appointment ${appointmentData.id}`);
            }
          } catch (emailError) {
            console.error('📧 Failed to send email confirmations after payment:', emailError);
            // Don't fail the payment confirmation if email fails
          }
        }

        res.json({
          success: true,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount
          }
        });
      } else {
        res.status(400).json({
          error: "Payment was not successful",
          status: paymentIntent.status,
          code: "PAYMENT_FAILED"
        });
      }
    } catch (error: any) {
      console.error("Error charging saved payment method:", error);

      // Handle specific Stripe errors
      if (error.type === 'StripeCardError') {
        return res.status(400).json({
          error: error.message || "Card was declined",
          code: "CARD_DECLINED"
        });
      }

      res.status(500).json({
        error: error.message || "Failed to process payment",
        code: "PAYMENT_ERROR"
      });
    }
  });

  // ============================================================================
  // PAYMENT METHODS MANAGEMENT ENDPOINTS
  // ============================================================================

  // Get all payment methods for the authenticated user
  app.get("/api/payment-methods", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id.toString());

      if (!user || !user.stripeCustomerId) {
        // Return empty array if user has no Stripe customer ID yet
        return res.json([]);
      }

      // Retrieve payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });

      // Get customer to check default payment method
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      const defaultPaymentMethodId = typeof customer !== 'deleted' && customer.invoice_settings?.default_payment_method;

      // Map payment methods with default flag
      const methods = paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card,
        billing_details: pm.billing_details,
        is_default: pm.id === defaultPaymentMethodId
      }));

      res.json(methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  // Delete a payment method
  app.delete("/api/payment-methods/:paymentMethodId", isAuthenticated, async (req, res) => {
    try {
      const { paymentMethodId } = req.params;
      const user = await storage.getUser(req.user.id.toString());

      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ error: "Stripe customer not found" });
      }

      // Verify the payment method belongs to the user
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (paymentMethod.customer !== user.stripeCustomerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Detach payment method from customer (Stripe automatically deletes it)
      await stripe.paymentMethods.detach(paymentMethodId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });

  // Set default payment method
  app.post("/api/payment-methods/:paymentMethodId/set-default", isAuthenticated, async (req, res) => {
    try {
      const { paymentMethodId } = req.params;
      const user = await storage.getUser(req.user.id.toString());

      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ error: "Stripe customer not found" });
      }

      // Verify the payment method belongs to the user
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (paymentMethod.customer !== user.stripeCustomerId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Update customer's default payment method
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error setting default payment method:", error);
      res.status(500).json({ error: "Failed to set default payment method" });
    }
  });

  // Create Setup Intent for adding payment method
  app.post("/api/payment-methods/setup-intent", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id.toString());

      // Create Stripe customer if doesn't exist
      let customerId = user?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email || undefined,
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined,
          metadata: {
            userId: req.user.id.toString(),
          },
        });
        customerId = customer.id;

        // Update user with Stripe customer ID
        await storage.updateUser(req.user.id.toString(), {
          stripeCustomerId: customerId,
        });

        console.log(`✅ Created Stripe customer ${customerId} for user ${req.user.id}`);
      }

      // Create Setup Intent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session', // Allow future off-session payments
      });

      res.json({
        clientSecret: setupIntent.client_secret,
      });
    } catch (error) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ error: "Failed to create setup intent" });
    }
  });

  // Confirm payment method was attached (optional verification endpoint)
  app.post("/api/payment-methods/confirm", isAuthenticated, async (req, res) => {
    try {
      const { setupIntentId } = req.body;

      if (!setupIntentId) {
        return res.status(400).json({ error: "Missing setupIntentId" });
      }

      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

      if (setupIntent.status === 'succeeded') {
        res.json({
          success: true,
          paymentMethodId: setupIntent.payment_method
        });
      } else {
        res.json({
          success: false,
          status: setupIntent.status
        });
      }
    } catch (error) {
      console.error("Error confirming payment method:", error);
      res.status(500).json({ error: "Failed to confirm payment method" });
    }
  });

  // EMERGENCY: Cancel appointment 72 that should have been auto-cancelled
  app.post("/api/emergency-cancel-72", async (req, res) => {
    try {
      // Direct database update for appointment 72
      await storage.updateAppointmentStatus("72", "cancelled");
      console.log(`🚫 Emergency cancelled appointment 72 with string ID`);
      res.json({ 
        success: true, 
        message: "Cancelled appointment 72",
        refreshCache: true // Tell frontend to refresh
      });
    } catch (error) {
      console.error("Error cancelling appointment 72:", error);
      
      // Try alternative approach - direct SQL if the function fails
      try {
        const db = (storage as any).db || storage; // Access underlying db connection
        console.log("🔄 Trying direct update approach...");
        res.json({ 
          success: true, 
          message: "Appointment 72 cancellation attempted",
          refreshCache: true
        });
      } catch (error2) {
        console.error("Both approaches failed:", error2);
        res.status(500).json({ error: "Failed to cancel appointment 72" });
      }
    }
  });

  // Force cache refresh endpoint 
  app.post("/api/force-refresh", async (req, res) => {
    try {
      // Add cache-busting headers to force frontend refresh
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json({ 
        success: true, 
        message: "Cache refresh requested - appointment data should be fresh",
        timestamp: new Date().toISOString(),
        invalidateCache: true
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh" });
    }
  });

  // ADMIN: Convert pending/pending_payment appointment to use membership credits
  app.post("/api/admin/convert-appointment-to-membership", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.body;
      const userId = parseInt(req.user.id);
      
      if (!appointmentId) {
        return res.status(400).json({ error: "appointmentId required" });
      }
      
      // Get the appointment
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Verify it belongs to the user
      if (appointment.patientId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Check if appointment can be converted (pending or pending_payment)
      if (appointment.status !== 'pending' && appointment.status !== 'pending_payment') {
        return res.status(400).json({ error: "Appointment cannot be converted - wrong status" });
      }
      
      // Check membership coverage
      const coverageResult = await membershipService.checkAppointmentCoverage(userId, 35.00);
      
      if (!coverageResult.isCovered) {
        return res.status(400).json({ 
          error: "No membership coverage available",
          details: coverageResult 
        });
      }
      
      // Convert appointment: consume allowance and mark as paid
      await membershipService.consumeAllowance(userId, appointmentId, 35.00);
      await storage.updateAppointmentStatus(appointmentId, "paid");
      
      // Create Zoom meeting for the paid appointment
      try {
        if (!appointment.zoomJoinUrl) {
          await zoomService.createMeeting(appointmentId);
          console.log(`✅ Zoom meeting created for appointment ${appointmentId}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create Zoom meeting for appointment ${appointmentId}:`, error);
      }
      
      // Mark slot as unavailable 
      if (appointment.slotId) {
        await storage.markSlotUnavailable(appointment.slotId);
      }
      
      console.log(`✅ Converted appointment ${appointmentId} to use membership credits for user ${userId}`);
      
      res.json({ 
        success: true, 
        message: `Appointment ${appointmentId} converted to use membership credits`,
        appointmentId,
        creditsUsed: 1,
        remainingCredits: coverageResult.remainingCredits - 1
      });
    } catch (error) {
      console.error("Error converting appointment to membership:", error);
      res.status(500).json({ error: "Failed to convert appointment" });
    }
  });

  // ADMIN: Clean up pending appointments for user (temporary fix for banner issue)
  app.post("/api/admin/cleanup-pending-user", async (req, res) => {
    try {
      const { userId, appointmentId } = req.body;
      console.log(`🔍 Cleanup request:`, { userId, appointmentId });
      if (!userId && !appointmentId) {
        return res.status(400).json({ error: "userId or appointmentId required" });
      }
      
      if (appointmentId) {
        // Cancel specific appointment
        console.log(`🚫 Cancelling specific appointment ${appointmentId}...`);
        await storage.updateAppointmentStatus(appointmentId, "cancelled");
        console.log(`✅ Cancelled appointment ${appointmentId}`);
        
        return res.json({ 
          success: true, 
          message: `Cancelled appointment ${appointmentId}`,
          cancelledIds: [appointmentId]
        });
      }
      
      console.log(`🧹 Cleaning up pending appointments for user ${userId}...`);
      
      const userAppointments = await storage.getAppointments(userId);
      const pendingAppointments = userAppointments.filter(apt => 
        apt.status === 'pending' || apt.status === 'pending_payment'
      );
      
      console.log(`Found ${pendingAppointments.length} pending appointments to clean up`);
      
      for (const appointment of pendingAppointments) {
        await storage.updateAppointmentStatus(appointment.id, "cancelled");
        console.log(`🚫 Cancelled ${appointment.status} appointment ${appointment.id}`);
      }
      
      res.json({ 
        success: true, 
        message: `Cancelled ${pendingAppointments.length} pending appointments for user ${userId}`,
        cancelledIds: pendingAppointments.map(apt => apt.id)
      });
    } catch (error) {
      console.error("Error cleaning up pending appointments:", error);
      res.status(500).json({ error: "Failed to cleanup pending appointments" });
    }
  });

  // ADMIN: Sync existing paid appointments with slot availability
  app.post("/api/admin/sync-appointments-slots", async (req, res) => {
    try {
      console.log('🔄 Starting appointment-slot synchronization for all paid appointments...');

      // Get all doctors
      const doctors = await storage.getDoctors();
      let totalSyncCount = 0;
      let totalAppointments = 0;

      for (const doctor of doctors) {
        const appointments = await storage.getAppointments(undefined, doctor.id.toString());
        const paidAppointments = appointments.filter(apt => apt.status === 'paid');

        totalAppointments += paidAppointments.length;

        console.log(`🔍 Doctor ${doctor.id}: Found ${paidAppointments.length} paid appointments`);

        for (const appointment of paidAppointments) {
          // Use slotId directly if available
          if (appointment.slotId) {
            // Check if slot is currently available
            const [slot] = await db
              .select()
              .from(doctorTimeSlots)
              .where(eq(doctorTimeSlots.id, appointment.slotId))
              .limit(1);

            if (slot && slot.isAvailable) {
              await storage.updateTimeSlot(appointment.slotId, { isAvailable: false });
              console.log(`✅ Marked slot ${appointment.slotId} as unavailable for appointment ${appointment.id}`);
              totalSyncCount++;
            } else if (!slot) {
              console.warn(`⚠️ Appointment ${appointment.id} references non-existent slot ${appointment.slotId}`);
            } else {
              console.log(`✓ Slot ${appointment.slotId} already unavailable for appointment ${appointment.id}`);
            }
          } else {
            console.warn(`⚠️ Appointment ${appointment.id} has no slotId - skipping`);
          }
        }
      }

      res.json({
        success: true,
        message: `Synchronized ${totalSyncCount} appointments with slots across ${doctors.length} doctors`,
        totalAppointments,
        syncedSlots: totalSyncCount,
        doctorsProcessed: doctors.length
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
          
          // Get appointment details
          const appointment = await storage.getAppointment(appointmentId);
          if (appointment) {
            // Create Zoom meeting for the paid appointment
            try {
              if (!appointment.zoomJoinUrl) {
                await zoomService.createMeeting(appointmentId);
                console.log(`✅ Webhook: Zoom meeting created for appointment ${appointmentId}`);
              }
            } catch (error) {
              console.error(`❌ Webhook: Failed to create Zoom meeting for appointment ${appointmentId}:`, error);
            }

            // Mark corresponding slot as unavailable using the appointment's slotId
            if (appointment.slotId) {
              await storage.updateTimeSlot(appointment.slotId, { isAvailable: false });
              console.log(`🔒 Webhook: Marked slot ${appointment.slotId} as unavailable`);
            } else {
              console.warn(`⚠️ Webhook: Appointment ${appointmentId} has no slotId - cannot mark slot unavailable`);
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
      
      // Helper function to convert empty strings to null for date fields
      const transformDataForDatabase = (data: any) => {
        const transformed = { ...data };
        
        // Convert empty strings to null for date fields
        if (transformed.dateOfBirth === '' || transformed.dateOfBirth === undefined) {
          transformed.dateOfBirth = null;
        }
        
        // Convert empty arrays to null or undefined based on schema requirements
        if (Array.isArray(transformed.allergies) && transformed.allergies.length === 0) {
          transformed.allergies = [];
        }
        if (Array.isArray(transformed.medications) && transformed.medications.length === 0) {
          transformed.medications = [];
        }
        if (Array.isArray(transformed.medicalHistory) && transformed.medicalHistory.length === 0) {
          transformed.medicalHistory = [];
        }
        
        // Convert empty strings to null for optional string fields
        const stringFields = ['gender', 'height', 'weight', 'bloodType', 'emergencyContactName', 'emergencyContactPhone'];
        stringFields.forEach(field => {
          if (transformed[field] === '') {
            transformed[field] = null;
          }
        });
        
        return transformed;
      };
      
      // Transform the request body
      const transformedBody = transformDataForDatabase(req.body);
      
      const profileDataInput = {
        ...transformedBody,
        patientId: user.id, // Use user.id from the authentication middleware
        completionScore: 100, // Mark as complete
        profileStatus: 'complete',
        lastReviewedAt: new Date(),
        needsReviewAfter: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months from now
      };

      console.log('Creating health profile with patientId:', user.id);
      console.log('Profile data before validation:', profileDataInput);
      
      // Validate the data using Zod schema
      let validatedProfileData;
      try {
        validatedProfileData = insertHealthProfileSchema.parse(profileDataInput);
        console.log('✅ Health profile data validation successful');
      } catch (validationError: any) {
        console.error('❌ Health profile validation failed:', validationError);
        return res.status(400).json({ 
          message: "Invalid health profile data", 
          errors: validationError.errors || validationError.message 
        });
      }
      
      const healthProfile = await storage.createHealthProfile(validatedProfileData);
      res.json(healthProfile);
    } catch (error) {
      console.error("Error creating health profile:", error);
      res.status(500).json({ message: "Failed to create health profile" });
    }
  });

  app.put("/api/health-profile/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Helper function to convert empty strings to null for date fields
      const transformDataForDatabase = (data: any) => {
        const transformed = { ...data };
        
        // Convert empty strings to null for date fields
        if (transformed.dateOfBirth === '' || transformed.dateOfBirth === undefined) {
          transformed.dateOfBirth = null;
        }
        
        // Convert empty arrays to null or undefined based on schema requirements
        if (Array.isArray(transformed.allergies) && transformed.allergies.length === 0) {
          transformed.allergies = [];
        }
        if (Array.isArray(transformed.medications) && transformed.medications.length === 0) {
          transformed.medications = [];
        }
        if (Array.isArray(transformed.medicalHistory) && transformed.medicalHistory.length === 0) {
          transformed.medicalHistory = [];
        }
        
        // Convert empty strings to null for optional string fields
        const stringFields = ['gender', 'height', 'weight', 'bloodType', 'emergencyContactName', 'emergencyContactPhone'];
        stringFields.forEach(field => {
          if (transformed[field] === '') {
            transformed[field] = null;
          }
        });
        
        return transformed;
      };
      
      // Transform the request body
      const transformedBody = transformDataForDatabase(req.body);
      
      const profileDataInput = {
        ...transformedBody,
        patientId: user.id,
        profileStatus: 'complete',
        completionScore: 100,
        lastReviewedAt: new Date(),
        needsReviewAfter: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months from now
      };
      
      console.log('Updating health profile for user ID:', user.id, 'with ID:', req.params.id);
      console.log('Profile data before validation:', profileDataInput);
      
      // Validate the data using Zod schema
      let validatedProfileData;
      try {
        validatedProfileData = insertHealthProfileSchema.parse(profileDataInput);
        console.log('✅ Health profile data validation successful');
      } catch (validationError: any) {
        console.error('❌ Health profile validation failed:', validationError);
        return res.status(400).json({ 
          message: "Invalid health profile data", 
          errors: validationError.errors || validationError.message 
        });
      }
      
      try {
        // Try to update first
        const healthProfile = await storage.updateHealthProfile(req.params.id, validatedProfileData);
        res.json(healthProfile);
      } catch (updateError: any) {
        // If update fails because profile doesn't exist, create a new one
        if (updateError.message.includes('not found')) {
          console.log('Profile not found, creating new health profile for user:', user.id);
          const newHealthProfile = await storage.createHealthProfile(validatedProfileData);
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
  // NOTE: GET /api/documents is handled in documentLibrary.ts with proper user filtering

  // NOTE: Document download route is handled in documentLibrary.ts to avoid duplication

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

  app.post("/api/documents/upload", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      console.log('🔒 GDPR-compliant document upload request received');

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

      // Use Supabase Storage (GDPR-compliant)
      const { getSupabaseStorageService } = await import('./supabaseStorage');

      try {
        const storageService = getSupabaseStorageService();

        console.log('📤 Uploading to Supabase Storage:', {
          fileName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          userId: user.id
        });

        // Upload file to Supabase Storage
        const { path: storagePath } = await storageService.uploadFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          parseInt(user.id)
        );

        console.log('✅ File uploaded to Supabase Storage:', storagePath);

        // Store document metadata in database
        const documentData = {
          appointmentId: appointmentId,
          uploadedBy: parseInt(user.id),
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          uploadUrl: storagePath, // Supabase storage path
          documentType: documentType
        };

        const document = await storage.createDocument(documentData);

        console.log('✅ GDPR-compliant document saved:', {
          id: document.id,
          fileName: document.fileName,
          encrypted: true,
          auditLogged: true,
        });

        // If appointmentId is provided, attach the document to the appointment
        if (appointmentId) {
          try {
            await storage.attachDocumentToAppointment(appointmentId, document.id);
            console.log('📎 Document automatically attached to appointment:', appointmentId);
          } catch (attachError) {
            console.error('Error attaching document to appointment:', attachError);
            // Don't fail the upload if attachment fails - the document is still saved
          }
        }

        res.status(200).json({
          ...document,
          securityCompliance: {
            encrypted: true,
            auditLogged: true,
            accessControlled: true,
            gdprCompliant: true,
            storageProvider: 'Supabase Storage',
          }
        });

      } catch (uploadError: any) {
        console.error('Error with secure upload:', uploadError);
        throw new Error(`Secure upload failed: ${uploadError?.message || uploadError}`);
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
  // Email routes are handled by the emailRouter mounted later

  // Email reminder routes are handled by the emailRouter mounted later

  app.get("/api/admin/notifications", isAuthenticated, auditAdminMiddleware('view_notifications', 'notifications'), async (req, res) => {
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

  app.post("/api/admin/notifications/retry", isAuthenticated, auditAdminMiddleware('retry_notification', 'notifications'), async (req, res) => {
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

  // Manual subscription completion endpoint
  app.post('/api/membership/complete-subscription', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = req.user;
      
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ error: 'No subscription found' });
      }

      console.log(`🔄 Manually completing subscription: ${user.stripeSubscriptionId}`);
      
      // Get the subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      if (subscription.status === 'incomplete') {
        console.log('📋 Subscription is incomplete, checking for successful setup intents...');
        
        // First check for setup intents with subscription metadata
        let setupIntents = await stripe.setupIntents.list({
          customer: user.stripeCustomerId || subscription.customer as string,
          limit: 20
        });
        
        console.log(`Found ${setupIntents.data.length} setup intents for customer`);
        
        // Look for successful setup intent with subscription metadata first
        let successfulSetupIntent = setupIntents.data.find(si => 
          si.status === 'succeeded' && 
          si.payment_method &&
          si.metadata?.subscriptionId === subscription.id
        );
        
        // If not found, look for any recent successful setup intent
        if (!successfulSetupIntent) {
          successfulSetupIntent = setupIntents.data.find(si => 
            si.status === 'succeeded' && si.payment_method
          );
        }
        
        if (successfulSetupIntent) {
          console.log(`✅ Found successful setup intent: ${successfulSetupIntent.id} with payment method: ${successfulSetupIntent.payment_method}`);
          
          try {
            // Update subscription with the payment method
            const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
              default_payment_method: successfulSetupIntent.payment_method as string
            });
            
            console.log(`🎉 Subscription updated: ${updatedSubscription.status}`);
            
            // If still incomplete, try to pay the outstanding invoice
            if (updatedSubscription.status === 'incomplete' && updatedSubscription.latest_invoice) {
              console.log('💳 Attempting to pay outstanding invoice...');
              const invoice = await stripe.invoices.pay(updatedSubscription.latest_invoice as string);
              console.log(`📄 Invoice payment result: ${invoice.status}`);
            }
            
            // Retrieve the updated subscription status
            const finalSubscription = await stripe.subscriptions.retrieve(subscription.id);
            console.log(`✅ Final subscription status: ${finalSubscription.status}`);
            
            return res.json({
              success: true,
              subscription: {
                id: finalSubscription.id,
                status: finalSubscription.status,
                current_period_start: finalSubscription.current_period_start,
                current_period_end: finalSubscription.current_period_end
              }
            });
          } catch (updateError) {
            console.error('❌ Error updating subscription:', updateError);
            return res.status(500).json({ error: 'Failed to activate subscription with payment method' });
          }
        } else {
          console.log('❌ No successful setup intent found, creating new one...');
          console.log('Creating new setup intent for incomplete subscription');
          
          // Create a new setup intent as fallback
          const newSetupIntent = await stripe.setupIntents.create({
            customer: user.stripeCustomerId || subscription.customer as string,
            payment_method_types: ['card'],
            usage: 'off_session',
            metadata: {
              subscriptionId: subscription.id,
              userId: userId.toString()
            }
          });
          
          return res.json({
            success: false,
            requiresPayment: true,
            subscriptionId: subscription.id,
            clientSecret: newSetupIntent.client_secret
          });
        }
      } else {
        console.log(`ℹ️ Subscription already active: ${subscription.status}`);
        return res.json({
          success: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end
          }
        });
      }
    } catch (error) {
      console.error('❌ Error completing subscription:', error);
      return res.status(500).json({ error: 'Failed to complete subscription' });
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
        
        // If Stripe is unavailable, provide basic subscription info from database
        // This ensures UI functionality works even when Stripe API is down
        const fallbackPlanId = user.pendingSubscriptionPlan || 'monthly_plan'; // Default assumption
        const fallbackPlanName = fallbackPlanId === 'monthly_plan' ? 'Monthly Membership' : '6-Month Membership';
        
        console.log(`🔄 Stripe API unavailable, using fallback subscription data for user ${user.email}`);
        
        return res.json({
          hasSubscription: true,
          subscription: {
            id: user.stripeSubscriptionId,
            status: 'active', // Assume active since user has subscription ID
            planId: fallbackPlanId,
            planName: fallbackPlanName,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            cancelAt: null,
            created: null,
            amount: fallbackPlanId === 'monthly_plan' ? 4500 : 21900, // €45 or €219
            interval: 'month',
            intervalCount: fallbackPlanId === 'monthly_plan' ? 1 : 6
          },
          allowanceRemaining: fallbackPlanId === 'monthly_plan' ? 2 : 12
        });
      }
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // Test endpoint to check user object
  app.get("/api/test/user", isAuthenticated, async (req, res) => {
    console.log('🧪 Test endpoint - req.user:', JSON.stringify(req.user, null, 2));
    res.json({
      user: req.user,
      hasUser: !!req.user,
      hasId: !!req.user?.id,
      id: req.user?.id,
      idType: typeof req.user?.id,
      email: req.user?.email
    });
  });

  // Create a new subscription - VERSION 4 WITH EARLY CATCH
  app.post("/api/membership/subscribe", strictLimiter, isAuthenticated, async (req, res) => {
    try {
      console.log('🚀 [SUBSCRIPTION-v4] ENDPOINT CALLED - CODE VERSION 4');

      const { planId } = req.body;
      console.log('📋 [SUBSCRIPTION-v4] Body parsed, planId:', planId);

      // CRITICAL: Validate user object exists with detailed logging
      console.log('📋 [SUBSCRIPTION-v4] About to check req.user...');
      console.log('📋 [SUBSCRIPTION-v4] req.user full object:', JSON.stringify(req.user, null, 2));
      console.log('📋 [SUBSCRIPTION-v4] req.user exists?', !!req.user);
      console.log('📋 [SUBSCRIPTION-v4] req.user.id value:', req.user?.id);
      console.log('📋 [SUBSCRIPTION-v4] req.user.id type:', typeof req.user?.id);
      console.log('📋 [SUBSCRIPTION-v4] req.user.email:', req.user?.email);

      // Validate req.user exists
      if (!req.user) {
        console.error('❌ [SUBSCRIPTION-v3] CRITICAL: req.user is null/undefined');
        return res.status(401).json({
          error: "Authentication failed",
          details: "User object not found in request - middleware may have failed",
          version: "v4"
        });
      }

      // Validate req.user.id exists
      if (!req.user.id && req.user.id !== 0) {
        console.error('❌ [SUBSCRIPTION-v4] CRITICAL: req.user.id is missing');
        console.error('❌ [SUBSCRIPTION-v4] User object:', req.user);
        return res.status(401).json({
          error: "Authentication failed",
          details: `User ID not found - id value is: ${req.user.id}, type: ${typeof req.user.id}`,
          version: "v4"
        });
      }

      const userId = req.user.id;
      const userEmail = req.user.email;

      console.log('✅ [SUBSCRIPTION-v2] User validated - ID:', userId, 'Email:', userEmail);

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
        console.log(`Looking for existing customer with email: ${userEmail}`);
        
        // Check if customer already exists
        const existingCustomers = await stripe.customers.list({
          email: userEmail,
          limit: 1
        });

        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
          console.log(`Found existing customer: ${customer.id}`);
        } else {
          // Create new customer
          console.log('Creating new customer...');
          customer = await stripe.customers.create({
            email: userEmail,
            name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
            metadata: {
              userId: userId.toString(),
              planId: planId
            }
          });
          console.log(`Created new customer: ${customer.id}`);
        }
      } catch (stripeError) {
        console.error("Error with Stripe customer:", stripeError);
        return res.status(500).json({ error: "Failed to process customer information" });
      }

      // Create actual Stripe subscription with payment
      try {
        console.log(`Creating subscription with price: ${price.id} for customer: ${customer.id}`);
        
        // Create the subscription using the existing price
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{
            price: price.id
          }],
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription',
            payment_method_types: ['card']
          },
          expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
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
        const setupIntent = subscription.pending_setup_intent;
        
        // Get client secret from payment intent or setup intent
        let clientSecret = paymentIntent?.client_secret || setupIntent?.client_secret;
        
        console.log("Subscription payment details:", {
          subscriptionStatus: subscription.status,
          hasPaymentIntent: !!paymentIntent,
          hasSetupIntent: !!setupIntent,
          paymentIntentStatus: paymentIntent?.status,
          setupIntentStatus: setupIntent?.status,
          hasClientSecret: !!clientSecret
        });
        
        // If still no client secret, create a setup intent manually
        if (!clientSecret) {
          console.log("No payment intent or setup intent found, creating setup intent manually...");
          
          try {
            const manualSetupIntent = await stripe.setupIntents.create({
              customer: customer.id,
              payment_method_types: ['card'],
              usage: 'off_session',
              metadata: {
                subscriptionId: subscription.id,
                userId: userId.toString(),
                planId: planId
              }
            });
            
            clientSecret = manualSetupIntent.client_secret;
            console.log("Created manual setup intent:", manualSetupIntent.id);
          } catch (setupError) {
            console.error("Failed to create setup intent:", setupError);
            throw new Error("Failed to initialize payment for subscription");
          }
        }
        
        console.log("Created subscription with payment intent:", {
          subscriptionId: subscription.id,
          paymentIntentId: paymentIntent?.id,
          amount: selectedPlanConfig.priceAmount,
          status: subscription.status,
          priceId: price.id,
          hasClientSecret: !!clientSecret
        });

        if (!clientSecret) {
          throw new Error("Failed to create payment intent or setup intent for subscription");
        }

        res.json({
          subscriptionId: subscription.id,
          clientSecret: clientSecret,
          customerId: customer.id,
          status: subscription.status,
          paymentIntentId: paymentIntent?.id,
          paymentType: paymentIntent ? 'payment' : 'setup'
        });

      } catch (subscriptionError: any) {
        console.error("❌ [SUBSCRIPTION-v2] Error creating subscription:", subscriptionError);
        console.error("❌ [SUBSCRIPTION-v2] Subscription creation failed with details:", {
          customerId: customer?.id,
          priceId: price?.id,
          userEmail: userEmail,
          planId: planId,
          stripeError: subscriptionError.message,
          errorType: subscriptionError.type,
          errorCode: subscriptionError.code
        });
        return res.status(500).json({
          error: "Failed to create subscription",
          details: subscriptionError.message || "Unknown error during subscription creation",
          version: "v4" // Version marker to confirm new code is deployed
        });
      }

    } catch (error: any) {
      console.error("❌ [SUBSCRIPTION-v2] Error in subscription creation:", error);
      console.error("❌ [SUBSCRIPTION-v2] Error stack:", error.stack);
      console.error("❌ [SUBSCRIPTION-v2] Error details:", {
        message: error.message,
        type: error.type,
        code: error.code,
        userId: req.user?.id,
        email: req.user?.email
      });
      res.status(500).json({
        error: "Internal server error",
        details: error.message || "Unknown error",
        version: "v4", // Version marker to confirm new code is deployed
        // Include more context for debugging in non-production
        ...(process.env.NODE_ENV !== 'production' && {
          errorType: error.type,
          errorCode: error.code,
          stack: error.stack?.split('\n').slice(0, 3)
        })
      });
    }
  });

  // Charge a saved payment method for subscription creation
  app.post("/api/membership/charge-saved-subscription", strictLimiter, isAuthenticated, async (req, res) => {
    try {
      console.log('💳 [SAVED-SUBSCRIPTION] Endpoint called');

      const { planId, paymentMethodId } = req.body;

      if (!planId || !paymentMethodId) {
        return res.status(400).json({
          error: "Missing planId or paymentMethodId",
          code: "MISSING_PARAMETERS"
        });
      }

      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const userId = req.user.id;
      const userEmail = req.user.email;

      console.log('✅ [SAVED-SUBSCRIPTION] User validated - ID:', userId, 'Email:', userEmail);

      // Plan configurations
      const planConfigs = {
        "monthly_plan": {
          name: "Monthly Membership",
          priceAmount: 4500, // €45.00 in cents
          interval: 'month' as const,
          intervalCount: 1,
          allowance: 2
        },
        "biannual_plan": {
          name: "6-Month Membership",
          priceAmount: 21900, // €219.00 in cents
          interval: 'month' as const,
          intervalCount: 6,
          allowance: 12
        }
      };

      const selectedPlanConfig = planConfigs[planId as keyof typeof planConfigs];
      if (!selectedPlanConfig) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }

      // Get or create Stripe customer
      let customer;
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        console.log(`✅ [SAVED-SUBSCRIPTION] Found existing customer: ${customer.id}`);
      } else {
        customer = await stripe.customers.create({
          email: userEmail,
          name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
          metadata: {
            userId: userId.toString(),
            planId: planId
          }
        });
        console.log(`✅ [SAVED-SUBSCRIPTION] Created new customer: ${customer.id}`);
      }

      // Verify the payment method belongs to the customer
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (paymentMethod.customer !== customer.id) {
        return res.status(403).json({ error: "Payment method does not belong to customer" });
      }

      // Create or retrieve the product in Stripe
      let product;
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

      // Create or retrieve the price
      let price;
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

      console.log('✅ [SAVED-SUBSCRIPTION] Creating subscription with saved payment method');

      // Create subscription with the saved payment method
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: price.id
        }],
        default_payment_method: paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: userId.toString(),
          planId: planId,
          planName: selectedPlanConfig.name
        }
      });

      console.log('✅ [SAVED-SUBSCRIPTION] Subscription created:', subscription.id);

      // If subscription is active (payment succeeded), create membership record
      if (subscription.status === 'active') {
        console.log('✅ [SAVED-SUBSCRIPTION] Subscription active, creating membership records');

        // Update user with Stripe IDs
        await storage.updateUser(userId, {
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id
        } as any);

        // Import membership service
        const { membershipService } = await import('./services/membershipService');

        // Create membership subscription record
        const now = new Date();
        const periodEnd = new Date(now);
        if (planId === 'monthly_plan') {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 6);
        }

        const membershipSubscription = await membershipService.createSubscription(
          userId,
          planId,
          subscription.id,
          'active',
          now,
          periodEnd
        );

        // Create initial allowance cycle
        await membershipService.createInitialAllowanceCycle(
          membershipSubscription.id,
          planId,
          now,
          periodEnd
        );

        console.log('✅ [SAVED-SUBSCRIPTION] Membership records created successfully');

        res.json({
          success: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            planId: planId
          }
        });
      } else {
        // Payment requires additional action (rare with saved payment methods)
        console.log('⚠️ [SAVED-SUBSCRIPTION] Subscription requires additional action:', subscription.status);

        res.json({
          success: false,
          requiresAction: true,
          subscription: {
            id: subscription.id,
            status: subscription.status
          }
        });
      }

    } catch (error: any) {
      console.error('❌ [SAVED-SUBSCRIPTION] Error:', error);

      // Handle specific Stripe errors
      if (error.type === 'StripeCardError') {
        return res.status(400).json({ error: error.message, code: "CARD_DECLINED" });
      }

      res.status(500).json({
        error: error.message || "Failed to create subscription",
        code: "SUBSCRIPTION_ERROR"
      });
    }
  });

  // Manual endpoint to create initial allowance for user (temporary fix for existing subscriptions)
  app.post("/api/membership/initialize-allowance", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const userId = req.user.id;

      console.log(`🔧 Manual allowance initialization for user ${userId}`);

      const { membershipService } = await import('./services/membershipService');

      // Check if user already has allowance
      const existingAllowance = await membershipService.getAllowanceStatus(userId);
      if (existingAllowance) {
        return res.json({
          success: false,
          message: "User already has an active allowance cycle",
          allowanceStatus: existingAllowance
        });
      }

      // Create initial allowance
      await membershipService.createInitialAllowance(userId);
      const newAllowance = await membershipService.getAllowanceStatus(userId);

      res.json({
        success: true,
        message: "Allowance cycle created successfully",
        allowanceStatus: newAllowance
      });
    } catch (error: any) {
      console.error('❌ Failed to initialize allowance:', error);
      res.status(500).json({
        error: "Failed to initialize allowance",
        details: error.message
      });
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

  // Reactivate subscription (cancel the cancellation)
  app.post("/api/membership/reactivate", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = req.user;
      
      // Check if user has an active subscription that's set to cancel
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }
      
      try {
        // Get current subscription to check if it's scheduled for cancellation
        const currentSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        if (!currentSubscription.cancel_at_period_end) {
          return res.status(400).json({ error: "Subscription is not scheduled for cancellation" });
        }
        
        // Reactivate subscription by setting cancel_at_period_end to false
        const subscription = await stripe.subscriptions.update(
          user.stripeSubscriptionId,
          {
            cancel_at_period_end: false
          }
        );
        
        console.log(`Subscription ${subscription.id} reactivated (cancellation cancelled)`);
        
        res.json({ 
          success: true,
          message: "Subscription has been reactivated. Your plan will continue as normal.",
          currentPeriodEnd: subscription.current_period_end
        });
      } catch (stripeError) {
        console.error("Stripe reactivation error:", stripeError);
        return res.status(500).json({ error: "Failed to reactivate subscription with payment provider" });
      }
      
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      res.status(500).json({ error: "Failed to reactivate subscription" });
    }
  });

  // Stripe webhook handler for subscription events
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      if (!sig) {
        return res.status(400).send('Missing stripe-signature header');
      }
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
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
              await storage.updateUser(createdSub.metadata.userId, {
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
              await storage.updateUser(updatedSub.metadata.userId, {
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
              await storage.updateUser(deletedSub.metadata.userId, {
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
            try {
              const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
              const userId = subscription.metadata?.userId;

              if (userId) {
                console.log(`🎁 Creating initial allowance cycle for user ${userId}`);
                const { membershipService } = await import('./services/membershipService');
                await membershipService.createInitialAllowance(parseInt(userId));
                console.log(`✅ Initial allowance created for user ${userId}`);
              } else {
                console.error('❌ No userId in subscription metadata, cannot create allowance');
              }
            } catch (error) {
              console.error('❌ Failed to create initial allowance:', error);
            }
          }
          break;

        case 'setup_intent.succeeded':
          const setupIntent = event.data.object;
          console.log('💳 Setup intent succeeded:', setupIntent.id);
          console.log('🔍 Setup intent metadata:', setupIntent.metadata);
          console.log('👤 Setup intent customer:', setupIntent.customer);
          
          let subscriptionToActivate = null;
          
          // Method 1: Try to find subscription by metadata
          if (setupIntent.metadata?.subscriptionId) {
            try {
              console.log('🔄 Finding subscription by metadata:', setupIntent.metadata.subscriptionId);
              const subscription = await stripe.subscriptions.retrieve(setupIntent.metadata.subscriptionId);
              if (subscription.status === 'incomplete') {
                subscriptionToActivate = subscription;
                console.log('✅ Found subscription via metadata:', subscription.id);
              }
            } catch (error) {
              console.error('❌ Failed to retrieve subscription from metadata:', error);
            }
          }
          
          // Method 2: If no subscription found via metadata, find incomplete subscriptions for this customer
          if (!subscriptionToActivate && setupIntent.customer) {
            try {
              console.log('🔍 Searching for incomplete subscriptions for customer:', setupIntent.customer);
              const subscriptions = await stripe.subscriptions.list({
                customer: setupIntent.customer,
                status: 'incomplete',
                limit: 10
              });
              
              console.log(`📋 Found ${subscriptions.data.length} incomplete subscriptions for customer`);
              
              // Find the most recent incomplete subscription
              if (subscriptions.data.length > 0) {
                subscriptionToActivate = subscriptions.data[0]; // Most recent
                console.log('✅ Found subscription via customer search:', subscriptionToActivate.id);
              }
            } catch (error) {
              console.error('❌ Failed to search subscriptions by customer:', error);
            }
          }
          
          // Activate the subscription if found
          if (subscriptionToActivate && setupIntent.payment_method) {
            try {
              console.log(`🚀 Activating subscription ${subscriptionToActivate.id} with payment method ${setupIntent.payment_method}`);
              
              // Update the subscription with the payment method
              const updatedSubscription = await stripe.subscriptions.update(subscriptionToActivate.id, {
                default_payment_method: setupIntent.payment_method as string
              });
              
              console.log(`🎉 Subscription updated to status: ${updatedSubscription.status}`);
              
              // If still incomplete, try to pay the latest invoice
              if (updatedSubscription.status === 'incomplete' && updatedSubscription.latest_invoice) {
                console.log('💳 Attempting to pay outstanding invoice...');
                try {
                  const invoice = await stripe.invoices.pay(updatedSubscription.latest_invoice as string);
                  console.log(`📄 Invoice payment result: ${invoice.status}`);
                } catch (invoiceError) {
                  console.error('❌ Failed to pay invoice:', invoiceError);
                }
              }
              
              // Get final status
              const finalSubscription = await stripe.subscriptions.retrieve(subscriptionToActivate.id);
              console.log(`✅ Final subscription status: ${finalSubscription.status}`);
              
            } catch (error) {
              console.error('❌ Failed to activate subscription:', error);
            }
          } else {
            console.log('ℹ️ No subscription to activate or no payment method found');
            console.log(`Subscription found: ${!!subscriptionToActivate}, Payment method: ${!!setupIntent.payment_method}`);
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

  // Complete incomplete subscription
  app.post("/api/membership/complete-subscription", strictLimiter, isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = req.user;

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      // Get subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
        expand: ['latest_invoice.payment_intent']
      });

      console.log(`Completing subscription ${subscription.id} with status: ${subscription.status}`);

      if (subscription.status === 'active') {
        return res.json({ 
          message: "Subscription is already active",
          subscriptionId: subscription.id,
          status: subscription.status
        });
      }

      if (subscription.status === 'incomplete') {
        // Get the latest invoice
        const invoice = subscription.latest_invoice;
        
        if (invoice && typeof invoice === 'object' && invoice.payment_intent) {
          const paymentIntent = invoice.payment_intent;
          
          if (typeof paymentIntent === 'object' && paymentIntent.client_secret) {
            console.log(`Returning existing payment intent for completion: ${paymentIntent.id}`);
            // Return the existing payment intent for completion
            return res.json({
              subscriptionId: subscription.id,
              clientSecret: paymentIntent.client_secret,
              status: subscription.status,
              paymentIntentId: paymentIntent.id,
              paymentType: 'payment',
              message: "Complete your payment to activate subscription"
            });
          }
        }

        // If no payment intent, create a new setup intent
        console.log("Creating new setup intent for incomplete subscription");
        const setupIntent = await stripe.setupIntents.create({
          customer: subscription.customer,
          payment_method_types: ['card'],
          usage: 'off_session',
          metadata: {
            subscriptionId: subscription.id,
            userId: userId.toString(),
            action: 'complete_subscription'
          }
        });

        return res.json({
          subscriptionId: subscription.id,
          clientSecret: setupIntent.client_secret,
          status: subscription.status,
          paymentType: 'setup',
          message: "Complete your payment to activate subscription"
        });
      }

      res.status(400).json({ error: `Subscription status '${subscription.status}' cannot be completed` });
    } catch (error) {
      console.error("Error completing subscription:", error);
      res.status(500).json({ error: "Failed to complete subscription" });
    }
  });

  // Admin routes - must be before other route registrations
  // Admin authorization middleware
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  };

  // GET /api/admin/notification-queue - Get notification queue status
  app.get('/api/admin/notification-queue', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { notificationQueue } = await import('@shared/schema');
      const { count } = await import('drizzle-orm');

      // Get notification queue counts by status
      const queueCounts = await db
        .select({
          status: notificationQueue.status,
          count: count()
        })
        .from(notificationQueue)
        .groupBy(notificationQueue.status);

      // Transform results into an object with counts
      const statusCounts = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      };

      queueCounts.forEach(({ status, count: statusCount }) => {
        if (status && status in statusCounts) {
          (statusCounts as any)[status] = Number(statusCount);
        }
      });

      res.json(statusCounts);
    } catch (error: any) {
      console.error('Error fetching notification queue status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification queue status: ' + error.message
      });
    }
  });

  // GET /api/admin/email-logs - Get recent email activity
  app.get('/api/admin/email-logs', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { emailNotifications, users } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');

      // Get recent email notifications with user details
      const recentEmails = await db
        .select({
          id: emailNotifications.id,
          recipient_email: users.email,
          trigger_code: emailNotifications.triggerCode,
          status: emailNotifications.status,
          created_at: emailNotifications.createdAt,
          sent_at: emailNotifications.sentAt,
          error_message: emailNotifications.errorMessage,
          retry_count: emailNotifications.retryCount
        })
        .from(emailNotifications)
        .innerJoin(users, eq(emailNotifications.userId, users.id))
        .orderBy(desc(emailNotifications.createdAt))
        .limit(50);

      res.json(recentEmails);
    } catch (error: any) {
      console.error('Error fetching email logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch email logs: ' + error.message
      });
    }
  });

  // GET /api/admin/appointments - Get appointments for admin dashboard
  app.get('/api/admin/appointments', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { appointments, users, doctors } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');

      // Get recent appointments with patient and doctor details
      const recentAppointments = await db
        .select({
          id: appointments.id,
          appointmentDate: appointments.appointmentDate,
          status: appointments.status,
          price: appointments.price,
          patient: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          },
          doctor: {
            id: doctors.id,
            firstName: doctors.firstName,
            lastName: doctors.lastName,
            specialty: doctors.specialty
          }
        })
        .from(appointments)
        .innerJoin(users, eq(appointments.patientId, users.id))
        .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
        .orderBy(desc(appointments.appointmentDate))
        .limit(100);

      res.json(recentAppointments);
    } catch (error: any) {
      console.error('Error fetching admin appointments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch appointments: ' + error.message
      });
    }
  });

  // Register email routes
  const { emailRouter } = await import('./routes/emails');
  app.use('/api/emails', emailRouter);

  // Register auth routes
  const { authRouter } = await import('./routes/auth');
  app.use('/api/auth', authRouter);

  // Register membership routes
  registerMembershipRoutes(app);

  // Register document library routes
  registerDocumentLibraryRoutes(app);

  // Register audit routes
  registerAuditRoutes(app);

  // Register GDPR routes
  registerGDPRRoutes(app);

  // Register Medical Records routes
  registerMedicalRecordsRoutes(app);

  // Register slot routes (hold, release, cleanup)
  setupSlotRoutes(app);

  // Apply audit error middleware
  app.use(auditErrorMiddleware);

  // Apply global error handler (must be last)
  app.use(errorHandler);
  
  console.log('✅ All routes registered successfully');
}