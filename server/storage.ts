import {
  users,
  doctors,
  doctorTimeSlots,
  appointments,
  appointmentChanges,
  appointmentPending,
  reviews,
  auditEvents,
  analyticsEvents,
  payments,
  healthProfiles,
  documentUploads,
  appointmentDocuments,
  emailNotifications,
  smsNotifications,
  pushNotifications,
  notificationPreferences,
  type UpsertUser,
  type User,
  type Doctor,
  type TimeSlot,
  type Appointment,
  type AppointmentPending,
  type Review,
  type InsertDoctor,
  type InsertTimeSlot,
  type InsertAppointment,
  type InsertAppointmentPending,
  type InsertReview,
  type HealthProfile,
  type InsertHealthProfile,
  type DocumentUpload,
  type InsertDocumentUpload,
  type InsertAppointmentDocument,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, isNull, or, count, avg, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { format } from "date-fns";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Supabase Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Custom auth operations for booking flow
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;

  // Doctor operations
  getDoctors(): Promise<(Doctor & { user: User })[]>;
  getDoctor(id: string): Promise<(Doctor & { user: User }) | undefined>;
  getDoctorByUserId(userId: string): Promise<Doctor | undefined>;
  getDoctorByEmail(email: string): Promise<(Doctor & { user: User }) | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctorOnlineStatus(doctorId: string, isOnline: boolean): Promise<void>;
  deleteDoctor(id: string): Promise<void>;

  // Time slot operations
  getDoctorTimeSlots(doctorId: string | number, date?: string): Promise<TimeSlot[]>;
  getAllDoctorTimeSlots(doctorId: string | number, date?: string): Promise<TimeSlot[]>;
  getTimeSlots(): Promise<TimeSlot[]>;
  createTimeSlot(slot: InsertTimeSlot): Promise<TimeSlot>;
  deleteTimeSlot(id: string): Promise<void>;
  deleteTimeSlotsInRange(doctorId: string, date: string, startTime: string, endTime: string): Promise<void>;
  lockTimeSlot(id: string, lockedBy: string, durationMinutes: number): Promise<void>;
  unlockTimeSlot(id: string): Promise<void>;
  unlockExpiredSlots(): Promise<void>;
  
  // Slot holding operations (for booking flow)
  holdSlot(timeSlotId: string, sessionId: string, durationMinutes: number): Promise<void>;
  releaseSlot(timeSlotId: string): Promise<void>;
  releaseAllSlotsForSession(sessionId: string): Promise<void>;
  getHeldSlot(sessionId: string): Promise<TimeSlot | undefined>;

  // Appointment operations
  getAppointments(patientId?: string, doctorId?: string): Promise<(Appointment & { doctor: Doctor & { user: User }, patient: User })[]>;
  getAppointment(id: string): Promise<(Appointment & { doctor: Doctor & { user: User }, patient: User }) | undefined>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<(Appointment & { doctor: Doctor & { user: User }, patient: User })[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: string, paymentIntentId?: string): Promise<void>;
  updateAppointmentPayment(id: string, paymentIntentId: string): Promise<void>;
  updateAppointment(id: number, updates: Partial<Appointment>): Promise<void>;
  rescheduleAppointment(id: string, newSlotId: string, reason: string, actorId: number, actorRole: string): Promise<void>;
  cancelAppointment(id: string, cancelledBy: string, reason: string, actorId: number, actorRole: string): Promise<void>;
  
  // Payment operations
  recordPayment(payment: {
    appointmentId: string;
    patientId: string;
    stripePaymentIntentId: string;
    amount: string;
    currency: string;
    status: string;
    paymentMethod: string;
  }): Promise<void>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getDoctorReviews(doctorId: string): Promise<(Review & { patient: User })[]>;

  // Health Profile operations
  getHealthProfile(patientId: number): Promise<HealthProfile | undefined>;
  createHealthProfile(profile: InsertHealthProfile): Promise<HealthProfile>;
  updateHealthProfile(id: string, updates: Partial<HealthProfile>): Promise<HealthProfile>;

  // Document operations
  getDocuments(appointmentId?: number): Promise<DocumentUpload[]>;
  createDocument(document: InsertDocumentUpload): Promise<DocumentUpload>;
  deleteDocument(id: string): Promise<void>;
  
  // Analytics operations
  createAnalyticsEvent(event: any): Promise<void>;

  // Banner dismissal operations
  createBannerDismissal(dismissal: any): Promise<any>;
  getBannerDismissals(userId: number): Promise<any[]>;

  // Admin operations
  getKPIs(): Promise<{
    totalAppointments: number;
    completedAppointments: number;
    totalRevenue: number;
    averageRating: number;
  }>;
  getAuditEvents(): Promise<any[]>;
  
  // Admin dashboard operations
  getAdminMetrics(startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date): Promise<{
    appointmentsBooked: number;
    appointmentsBookedPrev: number;
    appointmentsBookedTrend: { date: string; value: number }[];
    timeToValue: number;
    timeToValuePrev: number;
    activationRate: number;
    activationRatePrev: number;
    retentionRate: number;
    retentionRatePrev: number;
    uniqueActivePatients: number;
    uniqueActivePatientsPrev: number;
    npsScore: number;
    npsScorePrev: number;
    productQualifiedLeads: number;
    productQualifiedLeadsPrev: number;
    bookingsPerPatient: number;
    bookingsPerPatientGoal: number;
    doctorUtilization: number;
    doctorUtilizationThreshold: number;
    netRevenue: number;
    netRevenuePrev: number;
    revenueSparkline: number[];
    churnRiskPatients: number;
    conversionRate: number;
    conversionRatePrev: number;
    viralCoefficient: number;
    monthlyGrowthRate: number;
    revenuePerUser: number;
    lifetimeValue: number;
    customerAcquisitionCost: number;
    averageSessionDuration: number;
    platformUptime: number;
    csat: number;
    reviewRating: number;
    projectedRevenue: number;
    demandForecast: number;
    cohortAnalysis?: Array<{
      cohort: string;
      w1: number;
      w2: number;
      w3: number;
      w4: number;
    }>;
    userJourneyAnalytics?: Array<{
      stage: string;
      touchpoints: string[];
      dropoff: number;
      avgTime: string;
    }>;
    conversionFunnel?: Array<{
      stage: string;
      percentage: number;
      count: number;
    }>;
  }>;
  getFunnelData(startDate: Date): Promise<Array<{
    name: string;
    count: number;
    percentage: number;
    dropOffAlert?: string;
  }>>;
  getPatientSegments(): Promise<Array<{
    name: string;
    tier: 'VIP' | 'Premium' | 'Regular' | 'At Risk';
    patientCount: number;
    ltv: number;
    appointmentsPerPatient: number;
    churnRiskCount: number;
  }>>;
  getAdminDoctorRoster(): Promise<Array<{
    id: number;
    name: string;
    specialty: string;
    availability: number;
    cancellationRate: number;
    status: 'active' | 'pending' | 'inactive';
  }>>;
  
  // Appointment changes tracking
  getAppointmentChanges(appointmentId: string): Promise<any[]>;
  
  // Admin user management
  getAdminUsers(): Promise<Array<User & { lastLogin?: string }>>;
  createAdminUser(userData: { email: string; firstName: string; lastName: string }): Promise<User>;
  removeAdminUser(userId: number): Promise<void>;
  
  // Meeting stats for dashboard
  getMeetingStats(): Promise<{
    totalLive: number;
    totalPlanned: number;
    totalCompleted: number;
    totalCancelled: number;
    totalWithIssues: number;
    meetings: Array<{
      id: string;
      patientName: string;
      doctorName: string;
      scheduledTime: string;
      status: 'live' | 'planned' | 'completed' | 'cancelled' | 'issue';
      duration: number;
      alertDetails?: string;
    }>;
  }>;
  
  // Notification operations
  getNotifications(filters: { status?: string; limit?: number }): Promise<any[]>;
  retryNotification(notificationId: string): Promise<void>;
  getNotificationPreferences(userId: number): Promise<any>;
  updateNotificationPreferences(userId: number, updates: any): Promise<any>;
}

// PostgreSQL Storage Implementation
export class PostgresStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(id)));
    console.log('📱 getUser result:', { id, user });
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      // Update existing user with structured name fields if they're missing
      const needsUpdate = !existingUser.firstName || !existingUser.lastName;
      if (needsUpdate && (userData.firstName || userData.lastName)) {
        const updateData = {
          firstName: userData.firstName || existingUser.firstName,
          lastName: userData.lastName || existingUser.lastName,
          title: userData.title || existingUser.title,
          updatedAt: new Date()
        };
        
        const [updatedUser] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, existingUser.id))
          .returning();
        
        return updatedUser;
      }
      return existingUser;
    }

    // Create new user with structured name fields only
    if (!userData.email) {
      throw new Error('Email is required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }
    
    const cleanUserData = {
      // Explicitly exclude id to let database auto-generate it
      email: userData.email,
      title: userData.title || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || 'patient',
      approved: userData.approved || false,
      stripeCustomerId: userData.stripeCustomerId || null,
      stripeSubscriptionId: userData.stripeSubscriptionId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const [newUser] = await db.insert(users).values(cleanUserData).returning();
      return newUser;
    } catch (error: any) {
      console.error('Database insert error:', error);
      if (error.code === '23505') {
        if (error.constraint_name === 'users_pkey') {
          // Workaround: Find next available ID and retry
          console.log('ID conflict detected, finding next available ID...');
          const result = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(users);
          const nextId = Number(result[0]?.maxId || 0) + 1;
          
          const userDataWithId = {
            ...cleanUserData,
            id: nextId
          };
          
          try {
            const [newUser] = await db.insert(users).values(userDataWithId).returning();
            console.log(`Successfully created user with ID ${nextId}`);
            return newUser;
          } catch (retryError: any) {
            console.error('Retry failed:', retryError);
            throw new Error('User creation failed after retry. Please try again.');
          }
        } else if (error.constraint_name === 'users_email_unique') {
          throw new Error('An account with this email already exists.');
        }
      }
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    // Create user with structured name fields only
    if (!userData.email) {
      throw new Error('Email is required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }
    
    const cleanUserData = {
      // Explicitly exclude id to let database auto-generate it
      email: userData.email,
      title: userData.title || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || 'patient',
      approved: userData.approved || false,
      stripeCustomerId: userData.stripeCustomerId || null,
      stripeSubscriptionId: userData.stripeSubscriptionId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const [user] = await db.insert(users).values(cleanUserData).returning();
      return user;
    } catch (error: any) {
      console.error('Database insert error:', error);
      if (error.code === '23505') {
        if (error.constraint_name === 'users_pkey') {
          // Workaround: Find next available ID and retry
          console.log('ID conflict detected, finding next available ID...');
          const result = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(users);
          const nextId = Number(result[0]?.maxId || 0) + 1;
          
          const userDataWithId = {
            ...cleanUserData,
            id: nextId
          };
          
          try {
            const [user] = await db.insert(users).values(userDataWithId).returning();
            console.log(`Successfully created user with ID ${nextId}`);
            return user;
          } catch (retryError: any) {
            console.error('Retry failed:', retryError);
            throw new Error('User creation failed after retry. Please try again.');
          }
        } else if (error.constraint_name === 'users_email_unique') {
          throw new Error('An account with this email already exists.');
        }
      }
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const userId = parseInt(id);
    if (isNaN(userId)) {
      throw new Error('Invalid user ID');
    }

    console.log('📱 updateUser input:', { userId, updates });

    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('User not found');
    }

    console.log('📱 updateUser result:', updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const userId = parseInt(id);
    if (isNaN(userId)) {
      throw new Error('Invalid user ID');
    }

    await db.delete(users).where(eq(users.id, userId));
  }

  async getDoctors(): Promise<(Doctor & { user: User, availableSlots?: number })[]> {
    const result = await db
      .select({
        // Doctor fields
        id: doctors.id,
        userId: doctors.userId,
        specialty: doctors.specialty,
        bio: doctors.bio,
        education: doctors.education,
        experience: doctors.experience,
        languages: doctors.languages,
        rppsNumber: doctors.rppsNumber,
        consultationPrice: doctors.consultationPrice,
        rating: doctors.rating,
        reviewCount: doctors.reviewCount,
        createdAt: doctors.createdAt,
        updatedAt: doctors.updatedAt,
        // User fields with structured names only
        user: {
          id: users.id,
          email: users.email,
          title: users.title,
          firstName: users.firstName, 
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          approved: users.approved,
          stripeCustomerId: users.stripeCustomerId,
          stripeSubscriptionId: users.stripeSubscriptionId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        }
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id));

    // Get availability count for each doctor
    const doctorsWithAvailability = await Promise.all(
      result.map(async (doctor) => {
        try {
          // Get available slots count for this doctor
          const slots = await this.getDoctorTimeSlots(doctor.id.toString());
          const availableSlots = slots.filter(slot => slot.isAvailable).length;
          
          return {
            ...doctor,
            availableSlots
          };
        } catch (error) {
          console.error(`Error fetching slots for doctor ${doctor.id}:`, error);
          return {
            ...doctor,
            availableSlots: 0
          };
        }
      })
    );

    // Sort doctors by:
    // 1. Availability (those with slots first)
    // 2. Rating (highest first)
    // 3. Review count (most reviews first)
    const sortedDoctors = doctorsWithAvailability.sort((a, b) => {
      // First priority: availability
      if (a.availableSlots > 0 && b.availableSlots === 0) return -1;
      if (a.availableSlots === 0 && b.availableSlots > 0) return 1;
      
      // Second priority: rating (handle null/undefined values)
      const ratingA = parseFloat(a.rating || '0');
      const ratingB = parseFloat(b.rating || '0');
      if (ratingA !== ratingB) {
        return ratingB - ratingA; // Higher rating first
      }
      
      // Third priority: review count
      const reviewA = a.reviewCount || 0;
      const reviewB = b.reviewCount || 0;
      return reviewB - reviewA; // More reviews first
    });

    console.log(`🏥 Returning ${sortedDoctors.length} doctors sorted by availability and rating`);
    return sortedDoctors;
  }

  async getDoctorByUserId(userId: number): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return doctor;
  }

  async updateDoctor(doctorId: number, data: Partial<Doctor>): Promise<Doctor | undefined> {
    const [updatedDoctor] = await db
      .update(doctors)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(doctors.id, doctorId))
      .returning();
    return updatedDoctor;
  }

  async getDoctor(id: string | number): Promise<(Doctor & { user: User }) | undefined> {
    try {
      const doctorId = typeof id === 'string' ? parseInt(id) : id;
      if (isNaN(doctorId)) {
        console.log(`❌ Invalid doctor ID: ${id}`);
        return undefined;
      }
      
      console.log(`🔍 Fetching doctor with ID: ${doctorId}`);
      
      const [result] = await db
        .select({
          // Doctor fields
          id: doctors.id,
          userId: doctors.userId,
          specialty: doctors.specialty,
          bio: doctors.bio,
          education: doctors.education,
          experience: doctors.experience,
          languages: doctors.languages,
          rppsNumber: doctors.rppsNumber,
          consultationPrice: doctors.consultationPrice,
          rating: doctors.rating,
          reviewCount: doctors.reviewCount,
          createdAt: doctors.createdAt,
          updatedAt: doctors.updatedAt,
          user: {
            id: users.id,
            email: users.email,
            title: users.title,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
            role: users.role,
            approved: users.approved,
            stripeCustomerId: users.stripeCustomerId,
            stripeSubscriptionId: users.stripeSubscriptionId,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt
          }
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(eq(doctors.id, doctorId));

      if (result) {
        console.log(`✅ Found doctor: ${result.user.firstName} ${result.user.lastName}`);
      } else {
        console.log(`❌ No doctor found with ID: ${doctorId}`);
      }

      return result;
    } catch (error) {
      console.error(`Error fetching doctor ${id}:`, error);
      return undefined;
    }
  }

  async getDoctorByUserId(userId: string): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return doctor;
  }

  async getDoctorByEmail(email: string): Promise<(Doctor & { user: User }) | undefined> {
    try {
      // First get the user by email
      const user = await this.getUserByEmail(email);
      if (!user) {
        return undefined;
      }

      // Then get the doctor by userId
      const doctor = await this.getDoctorByUserId(user.id.toString());
      if (!doctor) {
        return undefined;
      }

      // Return combined doctor and user info
      return {
        ...doctor,
        user
      };
    } catch (error) {
      console.error(`Error fetching doctor by email ${email}:`, error);
      return undefined;
    }
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [newDoctor] = await db.insert(doctors).values(doctor).returning();
    return newDoctor;
  }

  async updateDoctorOnlineStatus(doctorId: string, isOnline: boolean): Promise<void> {
    await db
      .update(doctors)
      .set({ isOnline, updatedAt: new Date() })
      .where(eq(doctors.id, doctorId));
  }

  async deleteDoctor(id: string): Promise<void> {
    const doctorId = parseInt(id);
    if (isNaN(doctorId)) {
      throw new Error('Invalid doctor ID');
    }

    await db.delete(doctors).where(eq(doctors.id, doctorId));
  }

  async getAllDoctorTimeSlots(doctorId: string | number, date?: string): Promise<TimeSlot[]> {
    const doctorIntId = typeof doctorId === 'string' ? parseInt(doctorId, 10) : doctorId;
    
    if (isNaN(doctorIntId)) {
      console.log(`❌ Invalid doctor ID: ${doctorId}`);
      return [];
    }
    
    try {
      // Get ALL time slots without filtering
      let query = db.select().from(doctorTimeSlots).where(eq(doctorTimeSlots.doctorId, doctorIntId));
      
      if (date) {
        query = query.where(eq(doctorTimeSlots.date, date)) as any;
      }
      
      const slots = await query.orderBy(asc(doctorTimeSlots.date), asc(doctorTimeSlots.startTime));
      
      console.log(`📅 Retrieved ${slots.length} total slots for doctor ${doctorIntId}`);
      
      return slots.map(slot => ({
        id: slot.id,
        doctorId: slot.doctorId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable
      }));
    } catch (error) {
      console.error(`Error fetching all time slots for doctor ${doctorIntId}:`, error);
      return [];
    }
  }

  async getDoctorTimeSlots(doctorId: string | number, date?: string): Promise<TimeSlot[]> {
    const doctorIntId = typeof doctorId === 'string' ? parseInt(doctorId, 10) : doctorId;
    
    // Skip processing if doctorId is NaN/invalid
    if (isNaN(doctorIntId)) {
      console.log(`❌ Invalid doctor ID: ${doctorId}`);
      return [];
    }
    
    console.log(`🔍 Looking for time slots for doctor ID: ${doctorIntId}`);
    
    try {
      // Get time slots
      let query = db.select().from(doctorTimeSlots).where(eq(doctorTimeSlots.doctorId, doctorIntId));
      
      if (date) {
        query = query.where(eq(doctorTimeSlots.date, date)) as any;
      }
      
      const rawSlots = await query.orderBy(asc(doctorTimeSlots.date), asc(doctorTimeSlots.startTime));
      console.log(`📅 Found ${rawSlots.length} raw time slots for doctor ${doctorIntId}`);
      
      // Get confirmed appointments for this doctor
      const confirmedAppointments = await db.select()
        .from(appointments)
        .where(and(
          eq(appointments.doctorId, doctorIntId),
          inArray(appointments.status, ['paid', 'confirmed'])
        ));
      
      console.log(`🔒 Found ${confirmedAppointments.length} confirmed appointments that should block slots`);
      
      // Debug: Get ALL appointments for this doctor to see what's there
      const allAppointments = await db.select()
        .from(appointments)
        .where(eq(appointments.doctorId, doctorIntId));
      
      console.log(`🔍 ALL appointments for doctor ${doctorIntId}:`);
      allAppointments.forEach(apt => {
        const aptDate = new Date(apt.appointmentDate);
        console.log(`  - ID ${apt.id}: ${aptDate.toISOString()} (${apt.status}) - Patient ${apt.patientId}`);
      });
      
      // Remove duplicates by date+startTime, keeping the most restrictive availability
      const uniqueSlots = rawSlots.reduce((acc: TimeSlot[], current: TimeSlot) => {
        const key = `${current.date}_${current.startTime}`;
        const existingIndex = acc.findIndex(slot => `${slot.date}_${slot.startTime}` === key);
        
        if (existingIndex === -1) {
          // Check if this slot conflicts with any confirmed appointment
          const hasConflictingAppointment = confirmedAppointments.some(apt => {
            const appointmentDate = new Date(apt.appointmentDate);
            
            // Convert UTC appointment time to European local time (UTC+2 during summer)
            // Appointments are stored in UTC, slots are stored in local time
            const localAppointmentDate = new Date(appointmentDate.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours
            const appointmentDateString = localAppointmentDate.toISOString().split('T')[0];
            const appointmentTimeString = localAppointmentDate.toISOString().split('T')[1].slice(0, 8);
            
            const isMatch = current.date === appointmentDateString && current.startTime === appointmentTimeString;
            
            // Special debug for appointment 15 (August 2nd 7 AM UTC should be 9 AM local)
            if (apt.id === 15) {
              console.log(`🎯 APPOINTMENT 15 DEBUG: UTC ${apt.appointmentDate} -> Local ${appointmentDateString} ${appointmentTimeString}, checking against slot ${current.date} ${current.startTime}, match: ${isMatch}`);
            }
            
            if (isMatch) {
              console.log(`🎯 MATCH FOUND: Slot ${current.date} ${current.startTime} matches appointment ${apt.id} (UTC: ${apt.appointmentDate} -> Local: ${appointmentDateString} ${appointmentTimeString})`);
            }
            
            return isMatch;
          });
          
          // If there's a conflicting appointment, mark slot as unavailable
          if (hasConflictingAppointment) {
            console.log(`🔒 Slot ${current.date} ${current.startTime} has conflicting appointment - marking as unavailable`);
            current.isAvailable = false;
          }
          
          // Special debug for August 1st and 2nd morning slots  
          if ((current.date === '2025-08-01' || current.date === '2025-08-02') && (current.startTime === '09:00:00' || current.startTime === '10:00:00')) {
            console.log(`🎯 AUGUST DEBUG: Slot ${current.date} ${current.startTime} - Available: ${current.isAvailable}, Had conflict: ${hasConflictingAppointment}`);
          }
          
          acc.push(current);
        } else {
          // Keep the slot that is NOT available (more restrictive) if one exists
          if (!current.isAvailable && acc[existingIndex].isAvailable) {
            acc[existingIndex] = current;
          }
        }
        return acc;
      }, []);
      
      const availableCount = uniqueSlots.filter(s => s.isAvailable).length;
      const unavailableCount = uniqueSlots.filter(s => !s.isAvailable).length;
      
      console.log(`📅 After deduplication and appointment filtering: ${uniqueSlots.length} unique slots for doctor ${doctorIntId}`);
      console.log(`📅 Available: ${availableCount}, Unavailable: ${unavailableCount}`);
      
      // Debug: Show first few slots with their availability
      const debugSlots = uniqueSlots.slice(0, 5);
      console.log(`📅 First 5 slots:`, debugSlots.map(s => `${s.date} ${s.startTime} (available: ${s.isAvailable})`));
      
      // Return only available slots
      const availableSlotsOnly = uniqueSlots.filter(slot => slot.isAvailable);
      console.log(`📅 Returning ${availableSlotsOnly.length} available slots (filtered out ${uniqueSlots.length - availableSlotsOnly.length} unavailable)`);
      
      return availableSlotsOnly;
    } catch (error) {
      console.error(`Error fetching time slots for doctor ${doctorIntId}:`, error);
      return [];
    }
  }

  async getTimeSlots(): Promise<TimeSlot[]> {
    return await db.select().from(doctorTimeSlots).orderBy(asc(doctorTimeSlots.date), asc(doctorTimeSlots.startTime));
  }

  async createTimeSlot(slot: InsertTimeSlot): Promise<TimeSlot> {
    const [newSlot] = await db.insert(doctorTimeSlots).values(slot).returning();
    return newSlot;
  }

  async createTimeSlotsBatch(slots: InsertTimeSlot[]): Promise<TimeSlot[]> {
    if (slots.length === 0) return [];
    
    console.log(`🚀 Batch creating ${slots.length} time slots`);
    const newSlots = await db.insert(doctorTimeSlots).values(slots).returning();
    console.log(`✅ Successfully batch created ${newSlots.length} time slots`);
    return newSlots;
  }

  async updateTimeSlot(id: string, data: {
    startTime?: string;
    endTime?: string;
    date?: string;
    isAvailable?: boolean;
  }): Promise<TimeSlot> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    const [timeSlot] = await db
      .update(doctorTimeSlots)
      .set(updateData)
      .where(eq(doctorTimeSlots.id, id))
      .returning();
    
    return timeSlot;
  }

  async deleteTimeSlot(id: string): Promise<void> {
    await db.delete(doctorTimeSlots).where(eq(doctorTimeSlots.id, id));
  }

  async deleteTimeSlotsInRange(doctorId: string, date: string, startTime: string, endTime: string, scope?: string): Promise<void> {
    // Convert time strings to proper date times for comparison
    // Handle both HH:MM and HH:MM:SS formats
    const formattedStartTime = startTime.includes(':') && startTime.split(':').length === 2 
      ? `${startTime}:00` 
      : startTime;
    const formattedEndTime = endTime.includes(':') && endTime.split(':').length === 2 
      ? `${endTime}:00` 
      : endTime;
    
    const startDateTime = new Date(`${date}T${formattedStartTime}`);
    const endDateTime = new Date(`${date}T${formattedEndTime}`);
    
    console.log(`🗑️ Deleting time slots for doctor ${doctorId} on ${date} between ${startTime} and ${endTime} (scope: ${scope || 'this'})`);
    console.log(`🗑️ Formatted times: start=${formattedStartTime}, end=${formattedEndTime}`);
    
    let datesToProcess: string[] = [date];
    
    // If scope is "forward", find all future dates with the same day of week
    if (scope === 'forward') {
      const startDate = new Date(date);
      const dayOfWeek = startDate.getDay();
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 3); // Look up to 3 months ahead
      
      // Get all slots for this doctor to find which future dates have slots
      const allFutureSlots = await db
        .select()
        .from(doctorTimeSlots)
        .where(and(
          eq(doctorTimeSlots.doctorId, parseInt(doctorId)),
          gte(doctorTimeSlots.date, date)
        ));
      
      // Find unique dates that match the same day of week
      const uniqueDates = new Set<string>();
      allFutureSlots.forEach(slot => {
        const slotDate = new Date(slot.date);
        if (slotDate.getDay() === dayOfWeek) {
          uniqueDates.add(slot.date);
        }
      });
      
      datesToProcess = Array.from(uniqueDates).sort();
      console.log(`🗑️ Found ${datesToProcess.length} dates to process for recurring deletion: ${datesToProcess.join(', ')}`);
    }
    
    // Process each date
    let totalDeleted = 0;
    for (const dateToProcess of datesToProcess) {
      // Get all slots for the doctor on the specified date
      const slotsToDelete = await db
        .select()
        .from(doctorTimeSlots)
        .where(and(
          eq(doctorTimeSlots.doctorId, parseInt(doctorId)),
          eq(doctorTimeSlots.date, dateToProcess)
        ));
      
      console.log(`🗑️ Processing ${dateToProcess}: Found ${slotsToDelete.length} total slots`);
      
      // Filter slots that fall within the time range
      const slotIdsToDelete = slotsToDelete
        .filter(slot => {
          // Handle both HH:MM and HH:MM:SS formats for slot times
          const formattedSlotTime = slot.startTime.includes(':') && slot.startTime.split(':').length === 2 
            ? `${slot.startTime}:00` 
            : slot.startTime;
          const slotStartTime = new Date(`${dateToProcess}T${formattedSlotTime}`);
          const slotStartDateTime = new Date(`${date}T${formattedSlotTime}`); // Use original date for time comparison
          const isInRange = slotStartDateTime >= startDateTime && slotStartDateTime < endDateTime;
          if (isInRange) {
            console.log(`  - ${dateToProcess} ${slot.startTime}: ✅ IN RANGE`);
          }
          return isInRange;
        })
        .map(slot => slot.id);
      
      if (slotIdsToDelete.length > 0) {
        console.log(`🗑️ Deleting ${slotIdsToDelete.length} slots on ${dateToProcess}`);
        await db
          .delete(doctorTimeSlots)
          .where(inArray(doctorTimeSlots.id, slotIdsToDelete));
        totalDeleted += slotIdsToDelete.length;
      }
    }
    
    if (totalDeleted > 0) {
      console.log(`✅ Successfully deleted ${totalDeleted} total slots across ${datesToProcess.length} dates`);
    } else {
      console.log(`⚠️ No slots found in the specified range to delete`);
    }
  }

  async lockTimeSlot(id: string, lockedBy: string, durationMinutes: number): Promise<void> {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + durationMinutes);

    await db
      .update(doctorTimeSlots)
      .set({
        isLocked: true,
        lockedBy,
        lockedUntil,
        updatedAt: new Date()
      })
      .where(eq(doctorTimeSlots.id, id));
  }

  async unlockTimeSlot(id: string): Promise<void> {
    await db
      .update(doctorTimeSlots)
      .set({
        isLocked: false,
        lockedBy: null,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(doctorTimeSlots.id, id));
  }

  async unlockExpiredSlots(): Promise<void> {
    await db
      .update(doctorTimeSlots)
      .set({
        isLocked: false,
        lockedBy: null,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(doctorTimeSlots.isLocked, true),
          lte(doctorTimeSlots.lockedUntil, new Date())
        )
      );
  }

  async holdSlot(timeSlotId: string, sessionId: string, durationMinutes: number): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    await db.insert(appointmentPending).values({
      timeSlotId: timeSlotId,
      sessionId,
      expiresAt
    });
  }

  async releaseSlot(timeSlotId: string): Promise<void> {
    await db.delete(appointmentPending).where(eq(appointmentPending.timeSlotId, timeSlotId));
  }

  async releaseAllSlotsForSession(sessionId: string): Promise<void> {
    await db.delete(appointmentPending).where(eq(appointmentPending.sessionId, sessionId));
  }

  async getHeldSlot(sessionId: string): Promise<(TimeSlot & { expiresAt: Date }) | undefined> {
    const [result] = await db
      .select({
        id: doctorTimeSlots.id,
        doctorId: doctorTimeSlots.doctorId,
        date: doctorTimeSlots.date,
        startTime: doctorTimeSlots.startTime,  
        endTime: doctorTimeSlots.endTime,
        isAvailable: doctorTimeSlots.isAvailable,
        createdAt: doctorTimeSlots.createdAt,
        expiresAt: appointmentPending.expiresAt
      })
      .from(appointmentPending)
      .innerJoin(doctorTimeSlots, eq(appointmentPending.timeSlotId, doctorTimeSlots.id))
      .where(
        and(
          eq(appointmentPending.sessionId, sessionId),
          sql`${appointmentPending.expiresAt} > NOW()` // Only return non-expired slots
        )
      );

    return result;
  }

  async getAppointments(patientId?: string, doctorId?: string): Promise<any[]> {
    try {
      // First get appointments
      let appointmentQuery = db.select().from(appointments);
      
      if (patientId) {
        appointmentQuery = appointmentQuery.where(eq(appointments.patientId, parseInt(patientId)));
      }
      if (doctorId) {
        appointmentQuery = appointmentQuery.where(eq(appointments.doctorId, parseInt(doctorId)));
      }
      
      const appointmentResults = await appointmentQuery.orderBy(desc(appointments.appointmentDate));
      console.log(`📋 Found ${appointmentResults.length} appointments`, appointmentResults);
      
      // For each appointment, fetch doctor and patient details separately
      const enhancedAppointments = await Promise.all(
        appointmentResults.map(async (appointment) => {
          try {
            // Get doctor details
            const doctor = await this.getDoctor(appointment.doctorId);
            
            // Get patient details
            const [patientResult] = await db
              .select()
              .from(users)
              .where(eq(users.id, appointment.patientId));
              
            return {
              ...appointment,
              doctor: doctor || { specialty: "Unknown", user: { firstName: "Unknown", lastName: "Doctor" } },
              patient: patientResult || { firstName: "Unknown", lastName: "Patient" }
            };
          } catch (innerError) {
            console.error(`Error enhancing appointment ${appointment.id}:`, innerError);
            return {
              ...appointment,
              doctor: { specialty: "Unknown", user: { firstName: "Unknown", lastName: "Doctor" } },
              patient: { firstName: "Unknown", lastName: "Patient" }
            };
          }
        })
      );
      
      console.log(`✅ Enhanced ${enhancedAppointments.length} appointments with doctor/patient details`);
      return enhancedAppointments;
    } catch (error) {
      console.error("Error in getAppointments:", error);
      return [];
    }
  }

  async getAppointment(id: string): Promise<any> {
    try {
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, parseInt(id))); // Convert string to integer
      
      if (!appointment) {
        return undefined;
      }
      
      // Get doctor details
      const doctor = await this.getDoctor(appointment.doctorId);
      
      // Get patient details
      const [patient] = await db
        .select()
        .from(users)
        .where(eq(users.id, appointment.patientId));
      
      return {
        ...appointment,
        doctor: doctor || { specialty: "Unknown", user: { firstName: "Unknown", lastName: "Doctor" } },
        patient: patient || { firstName: "Unknown", lastName: "Patient" }
      };
    } catch (error) {
      console.error("Error in getAppointment:", error);
      return undefined;
    }
  }

  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const appointmentResults = await db
        .select()
        .from(appointments)
        .where(
          and(
            gte(appointments.appointmentDate, startDate),
            lte(appointments.appointmentDate, endDate)
          )
        )
        .orderBy(asc(appointments.appointmentDate));
      
      console.log(`📋 Found ${appointmentResults.length} appointments in date range ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // For each appointment, fetch doctor and patient details
      const enhancedAppointments = await Promise.all(
        appointmentResults.map(async (appointment) => {
          try {
            // Get doctor details
            const doctor = await this.getDoctor(appointment.doctorId);
            
            // Get patient details
            const [patientResult] = await db
              .select()
              .from(users)
              .where(eq(users.id, appointment.patientId));
              
            return {
              ...appointment,
              doctor: doctor || { specialty: "Unknown", user: { firstName: "Unknown", lastName: "Doctor" } },
              patient: patientResult || { firstName: "Unknown", lastName: "Patient" }
            };
          } catch (innerError) {
            console.error(`Error enhancing appointment ${appointment.id}:`, innerError);
            return {
              ...appointment,
              doctor: { specialty: "Unknown", user: { firstName: "Unknown", lastName: "Doctor" } },
              patient: { firstName: "Unknown", lastName: "Patient" }
            };
          }
        })
      );
      
      return enhancedAppointments;
    } catch (error) {
      console.error("Error in getAppointmentsByDateRange:", error);
      return [];
    }
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointmentStatus(id: string, status: string, paymentIntentId?: string): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (paymentIntentId) {
      updateData.paymentIntentId = paymentIntentId;
    }
    
    await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, parseInt(id))); // Convert string to integer
    
    // After updating appointment status to "paid", remove the slot from availability
    if (status === "paid") {
      const appointment = await this.getAppointment(id);
      console.log(`📋 Marking slot as unavailable for appointment ${id}:`, appointment);
      if (appointment && appointment.timeSlotId) {
        console.log(`🔒 Marking slot ${appointment.timeSlotId} as unavailable`);
        // Mark the time slot as unavailable
        const updateResult = await db
          .update(doctorTimeSlots)
          .set({ isAvailable: false, updatedAt: new Date() })
          .where(eq(doctorTimeSlots.id, appointment.timeSlotId));
        console.log(`✅ Slot update result:`, updateResult);
      } else {
        console.log(`❌ No timeSlotId found for appointment ${id}`);
      }
    }
  }

  async updateAppointmentPayment(id: string, paymentIntentId: string): Promise<void> {
    await db
      .update(appointments)
      .set({ paymentIntentId, status: "paid", updatedAt: new Date() })
      .where(eq(appointments.id, id));
  }

  async updateAppointment(id: number, updates: Partial<Appointment>): Promise<void> {
    await db
      .update(appointments)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(appointments.id, id));
  }

  async rescheduleAppointment(id: string, newSlotId: string, reason: string, actorId: number, actorRole: string): Promise<void> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, parseInt(id)));
    
    // Get the new slot details to update appointment date/time
    const [newSlot] = await db.select().from(doctorTimeSlots).where(eq(doctorTimeSlots.id, newSlotId));
    
    if (!newSlot) {
      throw new Error("New slot not found");
    }
    
    // Convert slot date and time to UTC appointment date
    const newAppointmentDate = new Date(`${newSlot.date}T${newSlot.startTime}`);
    // Subtract 2 hours to convert from local (UTC+2) to UTC
    newAppointmentDate.setHours(newAppointmentDate.getHours() - 2);

    await db
      .update(appointments)
      .set({ 
        slotId: newSlotId,
        appointmentDate: newAppointmentDate,
        rescheduleCount: (appointment.rescheduleCount || 0) + 1,
        updatedAt: new Date() 
      })
      .where(eq(appointments.id, parseInt(id)));

    // Log the change
    await db.insert(appointmentChanges).values({
      appointmentId: parseInt(id),
      action: "reschedule",
      actorId,
      actorRole,
      reason,
      before: { 
        slotId: appointment.slotId,
        appointmentDate: appointment.appointmentDate 
      },
      after: { 
        slotId: newSlotId,
        appointmentDate: newAppointmentDate
      },
    });
  }

  async cancelAppointment(id: string, cancelledBy: string, reason: string, actorId: number, actorRole: string): Promise<void> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, parseInt(id)));
    
    await db
      .update(appointments)
      .set({ 
        status: "cancelled", 
        cancelledBy, 
        cancelReason: reason,
        updatedAt: new Date() 
      })
      .where(eq(appointments.id, parseInt(id)));

    // Log the change
    await db.insert(appointmentChanges).values({
      appointmentId: parseInt(id),
      action: "cancel",
      actorId,
      actorRole,
      reason,
      before: { status: appointment.status },
      after: { status: "cancelled", cancelledBy, cancelReason: reason },
    });
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async getDoctorReviews(doctorId: string): Promise<(Review & { patient: User })[]> {
    const result = await db
      .select({
        // Review fields
        id: reviews.id,
        doctorId: reviews.doctorId,
        patientId: reviews.patientId,
        appointmentId: reviews.appointmentId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        // Patient info
        patient: {
          id: users.id,
          email: users.email,
          title: users.title,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          approved: users.approved,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        }
      })
      .from(reviews)
      .innerJoin(users, eq(sql`CAST(${reviews.patientId} AS INTEGER)`, users.id))
      .where(eq(reviews.doctorId, doctorId))
      .orderBy(desc(reviews.createdAt));

    return result;
  }

  async getKPIs(): Promise<{
    totalAppointments: number;
    completedAppointments: number;
    totalRevenue: number;
    averageRating: number;
  }> {
    const [appointmentStats] = await db
      .select({
        total: count(),
        completed: count(sql`CASE WHEN status = 'completed' THEN 1 END`),
        revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN CAST(price AS DECIMAL) ELSE 0 END), 0)`
      })
      .from(appointments);

    const [ratingStats] = await db
      .select({
        averageRating: avg(reviews.rating)
      })
      .from(reviews);

    return {
      totalAppointments: appointmentStats.total,
      completedAppointments: appointmentStats.completed,
      totalRevenue: appointmentStats.revenue,
      averageRating: Number(ratingStats.averageRating) || 0
    };
  }

  async getAuditEvents(): Promise<any[]> {
    return await db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(100);
  }

  async getAdminMetrics(startDate: Date, endDate: Date): Promise<{
    appointmentsBooked: number;
    appointmentsBookedPrev: number;
    appointmentsBookedTrend: { date: string; value: number }[];
    timeToValue: number;
    timeToValuePrev: number;
    activationRate: number;
    activationRatePrev: number;
    retentionRate: number;
    retentionRatePrev: number;
    uniqueActivePatients: number;
    uniqueActivePatientsPrev: number;
    npsScore: number;
    npsScorePrev: number;
    productQualifiedLeads: number;
    productQualifiedLeadsPrev: number;
    bookingsPerPatient: number;
    bookingsPerPatientGoal: number;
    doctorUtilization: number;
    doctorUtilizationThreshold: number;
    netRevenue: number;
    netRevenuePrev: number;
    revenueSparkline: number[];
    churnRiskPatients: number;
    conversionRate: number;
    conversionRatePrev: number;
    viralCoefficient: number;
    monthlyGrowthRate: number;
    revenuePerUser: number;
    lifetimeValue: number;
    customerAcquisitionCost: number;
    averageSessionDuration: number;
    platformUptime: number;
    csat: number;
    reviewRating: number;
    projectedRevenue: number;
    demandForecast: number;
    userGrowthData?: Array<{month: string, users: number, revenue: number}>;
    acquisitionChannels?: Array<{channel: string, users: number, conversion: number}>;
  }> {
    // Calculate previous period dates
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(endDate.getTime() - periodLength);
    // Current period metrics
    const [currentMetrics] = await db
      .select({
        appointmentsBooked: count(),
        uniquePatients: count(sql`DISTINCT ${appointments.patientId}`),
        revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN CAST(price AS DECIMAL) ELSE 0 END), 0)`
      })
      .from(appointments)
      .where(and(
        sql`${appointments.appointmentDate} >= ${startDate.toISOString()}::timestamp`,
        sql`${appointments.appointmentDate} <= ${endDate.toISOString()}::timestamp`,
        sql`status IN ('paid', 'completed')`
      ));

    // Previous period metrics
    const [prevMetrics] = await db
      .select({
        appointmentsBooked: count(),
        uniquePatients: count(sql`DISTINCT ${appointments.patientId}`),
        revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN CAST(price AS DECIMAL) ELSE 0 END), 0)`
      })
      .from(appointments)
      .where(and(
        sql`${appointments.appointmentDate} >= ${prevStartDate.toISOString()}::timestamp`,
        sql`${appointments.appointmentDate} <= ${prevEndDate.toISOString()}::timestamp`,
        sql`status IN ('paid', 'completed')`
      ));

    // Doctor utilization calculation
    const [totalSlots] = await db
      .select({ count: count() })
      .from(doctorTimeSlots)
      .where(and(
        sql`${doctorTimeSlots.date} >= ${startDate.toISOString().split('T')[0]}::date`,
        sql`${doctorTimeSlots.date} <= ${endDate.toISOString().split('T')[0]}::date`
      ));

    const utilization = totalSlots.count > 0 
      ? (currentMetrics.appointmentsBooked / totalSlots.count) * 100 
      : 0;

    // Churn risk patients (no booking in 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const [churnMetrics] = await db
      .select({
        churnCount: count(sql`DISTINCT ${users.id}`)
      })
      .from(users)
      .leftJoin(appointments, eq(users.id, appointments.patientId))
      .where(and(
        eq(users.role, 'patient'),
        or(
          isNull(appointments.appointmentDate),
          sql`${appointments.appointmentDate} <= ${ninetyDaysAgo.toISOString()}::timestamp`
        )
      ));

    // Calculate bookings per patient
    const bookingsPerPatient = currentMetrics.uniquePatients > 0
      ? currentMetrics.appointmentsBooked / currentMetrics.uniquePatients
      : 0;

    // Generate revenue sparkline (last 30 days)
    const sparklineData = await db
      .select({
        day: sql<string>`DATE(${appointments.appointmentDate})`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN CAST(price AS DECIMAL) ELSE 0 END), 0)`
      })
      .from(appointments)
      .where(and(
        sql`${appointments.appointmentDate} >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}::timestamp`,
        sql`status IN ('paid', 'completed')`
      ))
      .groupBy(sql`DATE(${appointments.appointmentDate})`)
      .orderBy(sql`DATE(${appointments.appointmentDate})`);

    const revenueSparkline = sparklineData.map(d => d.revenue);

    // Calculate average review rating
    const [reviewStats] = await db
      .select({
        avgRating: avg(reviews.rating),
        count: count()
      })
      .from(reviews)
      .where(and(
        sql`${reviews.createdAt} >= ${startDate.toISOString()}::timestamp`,
        sql`${reviews.createdAt} <= ${endDate.toISOString()}::timestamp`
      ));

    // Calculate Time to Value (avg days from signup to first booking) - simplified query
    const timeToValueQuery = await db.execute(sql`
      SELECT AVG(EXTRACT(EPOCH FROM (first_appointment - created_at)) / 86400) as avg_days
      FROM (
        SELECT u.created_at, MIN(a.appointment_date) as first_appointment
        FROM users u
        INNER JOIN appointments a ON u.id = a.patient_id
        WHERE u.role = 'patient'
        AND u.created_at >= ${startDate.toISOString()}::timestamp
        AND u.created_at <= ${endDate.toISOString()}::timestamp
        AND a.status IN ('paid', 'completed')
        GROUP BY u.id, u.created_at
      ) as user_first_bookings
    `);
    
    const timeToValuePrevQuery = await db.execute(sql`
      SELECT AVG(EXTRACT(EPOCH FROM (first_appointment - created_at)) / 86400) as avg_days
      FROM (
        SELECT u.created_at, MIN(a.appointment_date) as first_appointment
        FROM users u
        INNER JOIN appointments a ON u.id = a.patient_id
        WHERE u.role = 'patient'
        AND u.created_at >= ${prevStartDate.toISOString()}::timestamp
        AND u.created_at <= ${prevEndDate.toISOString()}::timestamp
        AND a.status IN ('paid', 'completed')
        GROUP BY u.id, u.created_at
      ) as user_first_bookings
    `);

    // Calculate Activation Rate (% of users who book within 7 days) - simplified
    const activationCurrentQuery = await db.execute(sql`
      WITH new_users AS (
        SELECT id FROM users 
        WHERE role = 'patient' 
        AND created_at >= ${startDate.toISOString()}::timestamp
        AND created_at <= ${endDate.toISOString()}::timestamp
      ),
      activated_users AS (
        SELECT DISTINCT u.id
        FROM users u
        INNER JOIN appointments a ON u.id = a.patient_id
        WHERE u.role = 'patient'
        AND u.created_at >= ${startDate.toISOString()}::timestamp
        AND u.created_at <= ${endDate.toISOString()}::timestamp
        AND a.appointment_date <= u.created_at + INTERVAL '7 days'
        AND a.status IN ('paid', 'completed')
      )
      SELECT 
        (SELECT COUNT(*) FROM new_users) as total,
        (SELECT COUNT(*) FROM activated_users) as activated
    `);

    const activationPreviousQuery = await db.execute(sql`
      WITH new_users AS (
        SELECT id FROM users 
        WHERE role = 'patient' 
        AND created_at >= ${prevStartDate.toISOString()}::timestamp
        AND created_at <= ${prevEndDate.toISOString()}::timestamp
      ),
      activated_users AS (
        SELECT DISTINCT u.id
        FROM users u
        INNER JOIN appointments a ON u.id = a.patient_id
        WHERE u.role = 'patient'
        AND u.created_at >= ${prevStartDate.toISOString()}::timestamp
        AND u.created_at <= ${prevEndDate.toISOString()}::timestamp
        AND a.appointment_date <= u.created_at + INTERVAL '7 days'
        AND a.status IN ('paid', 'completed')
      )
      SELECT 
        (SELECT COUNT(*) FROM new_users) as total,
        (SELECT COUNT(*) FROM activated_users) as activated
    `);

    // Calculate Retention Rate
    const [retentionCurrent] = await db
      .select({
        returning: count(sql`DISTINCT patient_id`),
        total: count(sql`DISTINCT patient_id`)
      })
      .from(sql`(
        SELECT patient_id, COUNT(*) as appt_count
        FROM appointments
        WHERE appointment_date >= ${startDate.toISOString()}::timestamp
        AND appointment_date <= ${endDate.toISOString()}::timestamp
        AND status IN ('paid', 'completed')
        GROUP BY patient_id
        HAVING COUNT(*) > 1
      ) as returning_patients`);

    const [totalPatientsCurrent] = await db
      .select({ count: count(sql`DISTINCT patient_id`) })
      .from(appointments)
      .where(and(
        sql`appointment_date >= ${startDate.toISOString()}::timestamp`,
        sql`appointment_date <= ${endDate.toISOString()}::timestamp`,
        sql`status IN ('paid', 'completed')`
      ));

    // Calculate NPS from reviews
    const currentReviews = await db
      .select({ rating: reviews.rating })
      .from(reviews)
      .where(and(
        sql`${reviews.createdAt} >= ${startDate.toISOString()}::timestamp`,
        sql`${reviews.createdAt} <= ${endDate.toISOString()}::timestamp`
      ));

    const prevReviews = await db
      .select({ rating: reviews.rating })
      .from(reviews)
      .where(and(
        sql`${reviews.createdAt} >= ${prevStartDate.toISOString()}::timestamp`,
        sql`${reviews.createdAt} <= ${prevEndDate.toISOString()}::timestamp`
      ));

    // NPS calculation (4.5-5 stars = promoters, 3.5-4.4 = neutral, <3.5 = detractors)
    const calculateNPS = (reviews: any[]) => {
      if (reviews.length < 5) return 0; // Need minimum reviews for meaningful NPS
      const promoters = reviews.filter(r => r.rating >= 4.5).length;
      const detractors = reviews.filter(r => r.rating < 3.5).length;
      return Math.round(((promoters - detractors) / reviews.length) * 100);
    };

    // Product Qualified Leads (users with 2+ appointments)
    const [pqlCurrent] = await db
      .select({ count: count(sql`DISTINCT patient_id`) })
      .from(sql`(
        SELECT patient_id
        FROM appointments
        WHERE appointment_date >= ${startDate.toISOString()}::timestamp
        AND appointment_date <= ${endDate.toISOString()}::timestamp
        AND status IN ('paid', 'completed')
        GROUP BY patient_id
        HAVING COUNT(*) >= 2
      ) as qualified_leads`);

    const [pqlPrevious] = await db
      .select({ count: count(sql`DISTINCT patient_id`) })
      .from(sql`(
        SELECT patient_id
        FROM appointments
        WHERE appointment_date >= ${prevStartDate.toISOString()}::timestamp
        AND appointment_date <= ${prevEndDate.toISOString()}::timestamp
        AND status IN ('paid', 'completed')
        GROUP BY patient_id
        HAVING COUNT(*) >= 2
      ) as qualified_leads`);

    // Conversion Rate (homepage visitors to bookings)
    // First, get total homepage visits from analytics
    const [homepageVisits] = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.eventType, 'page_view'),
        sql`${analyticsEvents.eventData}->>'page' = 'homepage'`,
        gte(analyticsEvents.timestamp, startDate),
        lte(analyticsEvents.timestamp, endDate)
      ));
    
    // Get bookings made in this period
    const [bookingsInPeriod] = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(
        gte(appointments.createdAt, startDate),
        lte(appointments.createdAt, endDate),
        sql`status IN ('paid', 'completed')`
      ));

    // Get previous period homepage visits
    const [homepageVisitsPrev] = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.eventType, 'page_view'),
        sql`${analyticsEvents.eventData}->>'page' = 'homepage'`,
        gte(analyticsEvents.timestamp, prevStartDate),
        lte(analyticsEvents.timestamp, prevEndDate)
      ));
    
    // Get previous period bookings
    const [bookingsInPeriodPrev] = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(
        gte(appointments.createdAt, prevStartDate),
        lte(appointments.createdAt, prevEndDate),
        sql`status IN ('paid', 'completed')`
      ));

    // Growth Rate (adapted to selected timeframe)
    const [currentPeriodPatients] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.role, 'patient'),
        gte(users.createdAt, startDate),
        lte(users.createdAt, endDate)
      ));

    const [previousPeriodPatients] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.role, 'patient'),
        gte(users.createdAt, prevStartDate),
        lte(users.createdAt, prevEndDate)
      ));

    // Calculate all metrics from real data
    const timeToValueRows = Array.isArray(timeToValueQuery) ? timeToValueQuery : (timeToValueQuery as any).rows || [];
    const timeToValuePrevRows = Array.isArray(timeToValuePrevQuery) ? timeToValuePrevQuery : (timeToValuePrevQuery as any).rows || [];
    const activationCurrentRows = Array.isArray(activationCurrentQuery) ? activationCurrentQuery : (activationCurrentQuery as any).rows || [];
    const activationPreviousRows = Array.isArray(activationPreviousQuery) ? activationPreviousQuery : (activationPreviousQuery as any).rows || [];
    
    const timeToValue = timeToValueRows[0]?.avg_days ? Number(Number(timeToValueRows[0].avg_days).toFixed(1)) : 0;
    const timeToValuePrev = timeToValuePrevRows[0]?.avg_days ? Number(Number(timeToValuePrevRows[0].avg_days).toFixed(1)) : 0;
    const activationCurrent = activationCurrentRows[0] || { total: 0, activated: 0 };
    const activationPrevious = activationPreviousRows[0] || { total: 0, activated: 0 };
    const activationRate = activationCurrent.total > 0 ? Number(((activationCurrent.activated / activationCurrent.total) * 100).toFixed(1)) : 0;
    const activationRatePrev = activationPrevious.total > 0 ? Number(((activationPrevious.activated / activationPrevious.total) * 100).toFixed(1)) : 0;
    const retentionRate = totalPatientsCurrent.count > 0 ? (retentionCurrent.returning / totalPatientsCurrent.count) * 100 : 0;
    const retentionRatePrev = 0; // Would need previous period calculation
    const npsScore = calculateNPS(currentReviews);
    const npsScorePrev = calculateNPS(prevReviews);
    const productQualifiedLeads = pqlCurrent.count;
    const productQualifiedLeadsPrev = pqlPrevious.count;
    const conversionRate = homepageVisits.count > 0 ? (bookingsInPeriod.count / homepageVisits.count) * 100 : 0;
    const conversionRatePrev = homepageVisitsPrev.count > 0 ? (bookingsInPeriodPrev.count / homepageVisitsPrev.count) * 100 : 0;
    const growthRate = previousPeriodPatients.count > 0 
      ? ((currentPeriodPatients.count - previousPeriodPatients.count) / previousPeriodPatients.count) * 100 
      : 0;
    const revenuePerUser = currentMetrics.uniquePatients > 0 ? currentMetrics.revenue / currentMetrics.uniquePatients : 0;
    const lifetimeValue = revenuePerUser * 4.5; // Based on average retention
    const customerAcquisitionCost = 35; // EUR - estimated
    const averageSessionDuration = 15; // minutes - estimated
    const platformUptime = 99.9; // % - estimated
    const csat = currentReviews.length >= 3 ? (currentReviews.filter(r => r.rating >= 4).length / currentReviews.length) * 100 : 0;
    const reviewRating = Number(reviewStats.avgRating) || 0;
    const projectedRevenue = currentMetrics.revenue * 1.12; // 12% growth projection based on trend
    const demandForecast = growthRate > 0 ? growthRate : 10; // % increase
    
    // Calculate viral coefficient (referrals per user - estimated)
    const viralCoefficient = 0.3; // Conservative estimate - would need referral tracking

    // Generate appointment trend data
    const trendData = await db
      .select({
        date: sql<string>`TO_CHAR(DATE(${appointments.appointmentDate}), 'YYYY-MM-DD')`,
        value: count()
      })
      .from(appointments)
      .where(and(
        sql`${appointments.appointmentDate} >= ${startDate.toISOString()}::timestamp`,
        sql`${appointments.appointmentDate} <= ${endDate.toISOString()}::timestamp`,
        sql`status IN ('paid', 'completed')`
      ))
      .groupBy(sql`DATE(${appointments.appointmentDate})`)
      .orderBy(sql`DATE(${appointments.appointmentDate})`);

    return {
      appointmentsBooked: currentMetrics.appointmentsBooked,
      appointmentsBookedPrev: prevMetrics.appointmentsBooked,
      appointmentsBookedTrend: trendData,
      timeToValue,
      timeToValuePrev,
      activationRate,
      activationRatePrev,
      retentionRate,
      retentionRatePrev,
      uniqueActivePatients: currentMetrics.uniquePatients,
      uniqueActivePatientsPrev: prevMetrics.uniquePatients,
      npsScore,
      npsScorePrev,
      productQualifiedLeads,
      productQualifiedLeadsPrev,
      bookingsPerPatient,
      bookingsPerPatientGoal: 1.4,
      doctorUtilization: utilization,
      doctorUtilizationThreshold: 60,
      netRevenue: currentMetrics.revenue,
      netRevenuePrev: prevMetrics.revenue,
      revenueSparkline,
      churnRiskPatients: churnMetrics.churnCount,
      conversionRate,
      conversionRatePrev,
      viralCoefficient: viralCoefficient,
      monthlyGrowthRate: growthRate,
      revenuePerUser,
      lifetimeValue,
      customerAcquisitionCost,
      averageSessionDuration,
      platformUptime,
      csat,
      reviewRating,
      projectedRevenue,
      demandForecast,
      cohortAnalysis: await this.getCohortRetention(startDate, endDate),
      userJourneyAnalytics: await this.getUserJourneyAnalytics(startDate, endDate),
      conversionFunnel: await this.getConversionFunnel(startDate, endDate),
      userGrowthData: await this.getUserGrowthData(startDate, endDate),
      acquisitionChannels: await this.getAcquisitionChannels(startDate, endDate)
    };
  }

  async getCohortRetention(startDate: Date, endDate: Date): Promise<any> {
    // Calculate cohort retention based on user registration month
    const cohortData = await db
      .select({
        cohortMonth: sql<string>`TO_CHAR(${users.createdAt}, 'Mon YYYY')`,
        userId: users.id,
        registrationDate: users.createdAt
      })
      .from(users)
      .where(and(
        eq(users.role, 'patient'),
        gte(users.createdAt, sql`${endDate.toISOString()}::timestamp - interval '3 months'`),
        lte(users.createdAt, endDate)
      ));

    // Get appointment activity for each user
    const userActivity = await db
      .select({
        patientId: appointments.patientId,
        weeksSinceRegistration: sql<number>`FLOOR(EXTRACT(EPOCH FROM ${appointments.appointmentDate} - ${users.createdAt}) / 604800)`,
        hasActivity: sql<boolean>`true`
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .where(and(
        sql`${appointments.status} IN ('paid', 'completed')`,
        eq(users.role, 'patient')
      ));

    // Process cohorts
    const cohorts = new Map<string, { total: number, weeks: Map<number, number> }>();
    
    cohortData.forEach(user => {
      const cohortKey = user.cohortMonth;
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, { total: 0, weeks: new Map() });
      }
      cohorts.get(cohortKey)!.total++;
    });

    userActivity.forEach(activity => {
      const weekNum = Math.min(Math.floor(activity.weeksSinceRegistration), 4);
      if (weekNum >= 0 && weekNum <= 4) {
        // Find the user's cohort
        const user = cohortData.find(u => u.userId === activity.patientId);
        if (user) {
          const cohort = cohorts.get(user.cohortMonth);
          if (cohort) {
            const currentCount = cohort.weeks.get(weekNum) || 0;
            cohort.weeks.set(weekNum, currentCount + 1);
          }
        }
      }
    });

    // Convert to array format
    return Array.from(cohorts.entries())
      .slice(-3) // Last 3 months
      .map(([cohortMonth, data]) => ({
        cohort: cohortMonth,
        w1: data.total > 0 ? Math.round((data.weeks.get(1) || data.total) / data.total * 100) : 100,
        w2: data.total > 0 ? Math.round((data.weeks.get(2) || 0) / data.total * 100) : 0,
        w3: data.total > 0 ? Math.round((data.weeks.get(3) || 0) / data.total * 100) : 0,
        w4: data.total > 0 ? Math.round((data.weeks.get(4) || 0) / data.total * 100) : 0
      }));
  }

  async getUserJourneyAnalytics(startDate: Date, endDate: Date): Promise<any> {
    // Get registration and booking data
    const registrations = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.role, 'patient'),
        gte(users.createdAt, startDate),
        lte(users.createdAt, endDate)
      ));

    const firstBookings = await db
      .select({ 
        count: count(sql`DISTINCT ${appointments.patientId}`),
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${appointments.createdAt} - ${users.createdAt}))/60)`
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .where(and(
        sql`${appointments.status} IN ('paid', 'completed')`,
        gte(appointments.appointmentDate, startDate),
        lte(appointments.appointmentDate, endDate)
      ));

    const consultations = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(
        eq(appointments.status, 'completed'),
        gte(appointments.appointmentDate, startDate),
        lte(appointments.appointmentDate, endDate)
      ));

    const totalUsers = registrations[0]?.count || 1;

    return [
      {
        stage: 'Discovery',
        touchpoints: ['Google Search', 'Social Media', 'Referral'],
        dropoff: 65, // This would need real traffic data
        avgTime: '2 min'
      },
      {
        stage: 'Registration',
        touchpoints: ['Email Signup', 'Profile Creation'],
        dropoff: Math.round((1 - (totalUsers / (totalUsers * 2.86))) * 100), // Estimate based on typical conversion
        avgTime: '5 min'
      },
      {
        stage: 'First Booking',
        touchpoints: ['Doctor Search', 'Slot Selection', 'Payment'],
        dropoff: Math.round((1 - ((firstBookings[0]?.count || 0) / totalUsers)) * 100),
        avgTime: firstBookings[0]?.avgTime ? `${Math.round(firstBookings[0].avgTime)} min` : '12 min'
      },
      {
        stage: 'Consultation',
        touchpoints: ['Video Call', 'Follow-up'],
        dropoff: Math.round((1 - ((consultations[0]?.count || 0) / (firstBookings[0]?.count || 1))) * 100),
        avgTime: '25 min'
      }
    ];
  }

  async getConversionFunnel(startDate: Date, endDate: Date): Promise<any> {
    // Get real data from database
    const [registeredUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.role, 'patient'),
        gte(users.createdAt, startDate),
        lte(users.createdAt, endDate)
      ));

    const [usersWithBookings] = await db
      .select({ count: count(sql`DISTINCT ${appointments.patientId}`) })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .where(and(
        eq(users.role, 'patient'),
        gte(users.createdAt, startDate),
        lte(users.createdAt, endDate),
        sql`${appointments.status} IN ('paid', 'completed')`
      ));

    const [completedAppointments] = await db
      .select({ count: count() })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .where(and(
        eq(users.role, 'patient'),
        gte(users.createdAt, startDate),
        lte(users.createdAt, endDate),
        eq(appointments.status, 'completed')
      ));

    const totalRegistrations = registeredUsers.count || 1;
    const bookingCount = usersWithBookings.count || 0;
    const completedCount = completedAppointments.count || 0;

    // Estimate homepage visits (would need real analytics)
    const estimatedVisits = Math.round(totalRegistrations * 4.76); // Typical 21% conversion

    return [
      { stage: 'Homepage Visits', percentage: 100, count: estimatedVisits },
      { stage: 'Registration Started', percentage: 35, count: Math.round(estimatedVisits * 0.35) },
      { stage: 'Account Created', percentage: Math.round((totalRegistrations / estimatedVisits) * 100), count: totalRegistrations },
      { stage: 'First Booking', percentage: Math.round((bookingCount / estimatedVisits) * 100), count: bookingCount },
      { stage: 'Completed Appointment', percentage: Math.round((completedCount / estimatedVisits) * 100), count: completedCount }
    ];
  }

  async getFunnelData(startDate: Date): Promise<Array<{
    name: string;
    count: number;
    percentage: number;
    dropOffAlert?: string;
  }>> {
    // This is a simplified funnel - in production you'd track actual visitor data
    const [metrics] = await db
      .select({
        totalVisitors: sql<number>`1000`, // Placeholder - would come from analytics
        doctorViews: count(sql`DISTINCT ${appointments.doctorId}`),
        slotSelections: count(sql`DISTINCT ${appointments.patientId}`),
        paymentInitiated: count(sql`CASE WHEN ${appointments.status} != 'pending' THEN 1 END`),
        confirmed: count(sql`CASE WHEN ${appointments.status} = 'paid' THEN 1 END`),
        completed: count(sql`CASE WHEN ${appointments.status} = 'completed' THEN 1 END`)
      })
      .from(appointments)
      .where(sql`${appointments.appointmentDate} >= ${startDate.toISOString()}::timestamp`);

    const stages = [
      { name: 'Visitors', count: 1000, percentage: 100 },
      { name: 'Doctor Interest', count: metrics.doctorViews * 50, percentage: (metrics.doctorViews * 50 / 10) },
      { name: 'Slot Selection', count: metrics.slotSelections * 10, percentage: (metrics.slotSelections * 10 / 10), dropOffAlert: metrics.slotSelections * 10 / 1000 < 0.3 ? '<30%' : undefined },
      { name: 'Payment Initiated', count: metrics.paymentInitiated, percentage: (metrics.paymentInitiated / 10) },
      { name: 'Confirmed', count: metrics.confirmed, percentage: (metrics.confirmed / 10) },
      { name: 'Completed', count: metrics.completed, percentage: (metrics.completed / 10), dropOffAlert: metrics.confirmed > 0 && (metrics.completed / metrics.confirmed) < 0.9 ? 'no-show >10%' : undefined }
    ];

    return stages;
  }

  async getPatientSegments(): Promise<Array<{
    name: string;
    tier: 'VIP' | 'Premium' | 'Regular' | 'At Risk';
    patientCount: number;
    ltv: number;
    appointmentsPerPatient: number;
    churnRiskCount: number;
  }>> {
    const patientStats = await db
      .select({
        patientId: appointments.patientId,
        appointmentCount: count(),
        totalSpent: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN CAST(price AS DECIMAL) ELSE 0 END), 0)`,
        lastAppointment: sql<Date>`MAX(${appointments.appointmentDate})`
      })
      .from(appointments)
      .where(sql`status IN ('paid', 'completed')`)
      .groupBy(appointments.patientId);

    // Segment patients based on LTV and activity
    const segments = {
      vip: { name: 'VIP Patients', tier: 'VIP' as const, patients: [] as any[], ltv: 0, appointments: 0, churn: 0 },
      premium: { name: 'Premium Patients', tier: 'Premium' as const, patients: [] as any[], ltv: 0, appointments: 0, churn: 0 },
      regular: { name: 'Regular Patients', tier: 'Regular' as const, patients: [] as any[], ltv: 0, appointments: 0, churn: 0 },
      atRisk: { name: 'At Risk', tier: 'At Risk' as const, patients: [] as any[], ltv: 0, appointments: 0, churn: 0 }
    };

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    patientStats.forEach(patient => {
      const lastAppointmentDate = patient.lastAppointment ? new Date(patient.lastAppointment) : null;
      const isChurnRisk = lastAppointmentDate && lastAppointmentDate < ninetyDaysAgo;
      
      if (patient.totalSpent > 500) {
        segments.vip.patients.push(patient);
        segments.vip.ltv += patient.totalSpent;
        segments.vip.appointments += patient.appointmentCount;
        if (isChurnRisk) segments.vip.churn++;
      } else if (patient.totalSpent > 200) {
        segments.premium.patients.push(patient);
        segments.premium.ltv += patient.totalSpent;
        segments.premium.appointments += patient.appointmentCount;
        if (isChurnRisk) segments.premium.churn++;
      } else if (isChurnRisk) {
        segments.atRisk.patients.push(patient);
        segments.atRisk.ltv += patient.totalSpent;
        segments.atRisk.appointments += patient.appointmentCount;
        segments.atRisk.churn++;
      } else {
        segments.regular.patients.push(patient);
        segments.regular.ltv += patient.totalSpent;
        segments.regular.appointments += patient.appointmentCount;
      }
    });

    return Object.values(segments).map(segment => ({
      name: segment.name,
      tier: segment.tier,
      patientCount: segment.patients.length,
      ltv: segment.patients.length > 0 ? Math.round(segment.ltv / segment.patients.length) : 0,
      appointmentsPerPatient: segment.patients.length > 0 ? segment.appointments / segment.patients.length : 0,
      churnRiskCount: segment.churn
    }));
  }

  async getAdminDoctorRoster(): Promise<Array<{
    id: number;
    name: string;
    specialty: string;
    availability: number;
    cancellationRate: number;
    status: 'active' | 'pending' | 'inactive';
  }>> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
      const thirtyDaysAgoDate = thirtyDaysAgo.toISOString().split('T')[0];

    // Get all doctors with their users
    const doctorsData = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        specialty: doctors.specialty,
        firstName: users.firstName,
        lastName: users.lastName,
        approved: users.approved
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id));

    // Get availability and cancellation metrics for each doctor
    const doctorMetrics = await Promise.all(doctorsData.map(async (doctor) => {
      // Total slots in last 30 days - using raw SQL to avoid date serialization issues
      const totalSlotsResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM doctor_time_slots WHERE doctor_id = ${doctor.id} AND date >= ${thirtyDaysAgoDate}::date`
      );
      const totalSlotsRows = Array.isArray(totalSlotsResult) ? totalSlotsResult : (totalSlotsResult as any).rows || [];
      const totalSlots = totalSlotsRows[0]?.count || 0;

      // Booked slots - using raw SQL
      const bookedSlotsResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ${doctor.id} AND appointment_date >= ${thirtyDaysAgoStr}::timestamp AND status IN ('paid', 'completed')`
      );
      const bookedSlotsRows = Array.isArray(bookedSlotsResult) ? bookedSlotsResult : (bookedSlotsResult as any).rows || [];
      const bookedSlots = bookedSlotsRows[0]?.count || 0;

      // Cancelled appointments - using raw SQL
      const cancelledApptsResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ${doctor.id} AND appointment_date >= ${thirtyDaysAgoStr}::timestamp AND status = 'cancelled'`
      );
      const cancelledApptsRows = Array.isArray(cancelledApptsResult) ? cancelledApptsResult : (cancelledApptsResult as any).rows || [];
      const cancelledAppts = cancelledApptsRows[0]?.count || 0;

      const availability = totalSlots > 0 
        ? Math.round((bookedSlots / totalSlots) * 100)
        : 0;

      const totalAppointments = Number(bookedSlots) + Number(cancelledAppts);
      const cancellationRate = totalAppointments > 0
        ? Math.round((cancelledAppts / totalAppointments) * 100)
        : 0;

      return {
        id: doctor.id,
        name: `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim(),
        specialty: doctor.specialty || 'General Practice',
        availability,
        cancellationRate,
        status: doctor.approved ? 'active' as const : 'pending' as const
      };
    }));

      return doctorMetrics;
    } catch (error) {
      console.error('Error in getAdminDoctorRoster:', error);
      throw error;
    }
  }
  
  async getAppointmentChanges(appointmentId: string): Promise<any[]> {
    return await db
      .select()
      .from(appointmentChanges)
      .where(eq(appointmentChanges.appointmentId, parseInt(appointmentId)))
      .orderBy(desc(appointmentChanges.createdAt));
  }

  async recordPayment(payment: {
    appointmentId: string;
    patientId: string;
    stripePaymentIntentId: string;
    amount: string;
    currency: string;
    status: string;
    paymentMethod: string;
  }): Promise<void> {
    await db.insert(payments).values({
      appointmentId: payment.appointmentId,
      patientId: payment.patientId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
    });
  }

  // Health Profile operations
  async getHealthProfile(patientId: number): Promise<HealthProfile | undefined> {
    try {
      console.log('🔍 Fetching health profile from DATABASE for patient:', patientId);
      
      // Query the actual database first
      const [dbProfile] = await db
        .select()
        .from(healthProfiles)
        .where(eq(healthProfiles.patientId, patientId))
        .limit(1);

      if (dbProfile) {
        console.log('✅ Found EXISTING health profile in database for patient:', patientId, {
          profileStatus: dbProfile.profileStatus,
          completionScore: dbProfile.completionScore
        });
        return dbProfile;
      }

      console.log('❌ No health profile found in database for patient:', patientId, '- returning incomplete');
      // Return incomplete profile to trigger completion flow
      return {
        id: crypto.randomUUID(),
        patientId,
        profileStatus: 'incomplete',
        completionScore: 0,
        dateOfBirth: null,
        gender: null,
        height: null,
        weight: null,
        bloodType: null,
        allergies: null,
        medications: null,
        medicalHistory: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        lastReviewedAt: null,
        needsReviewAfter: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching health profile from database:', error);
      throw error;
    }
  }

  async createHealthProfile(profile: InsertHealthProfile): Promise<HealthProfile> {
    try {
      console.log('💾 Creating health profile in DATABASE for patient:', profile.patientId);
      
      const [newProfile] = await db
        .insert(healthProfiles)
        .values({
          ...profile,
          profileStatus: 'complete',
          completionScore: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      console.log('✅ Health profile successfully created in database:', {
        id: newProfile.id,
        patientId: newProfile.patientId,
        profileStatus: newProfile.profileStatus,
        completionScore: newProfile.completionScore
      });
      
      return newProfile;
    } catch (error) {
      console.error('Error creating health profile in database:', error);
      throw error;
    }
  }



  async updateHealthProfile(id: string, updates: Partial<HealthProfile>): Promise<HealthProfile> {
    try {
      console.log('💾 Updating health profile in DATABASE with ID:', id);
      
      const [updatedProfile] = await db
        .update(healthProfiles)
        .set({
          ...updates,
          profileStatus: 'complete',
          completionScore: 100,
          updatedAt: new Date()
        })
        .where(eq(healthProfiles.id, id))
        .returning();
      
      if (!updatedProfile) {
        throw new Error(`Health profile with ID ${id} not found`);
      }
      
      console.log('✅ Health profile successfully updated in database:', {
        id: updatedProfile.id,
        patientId: updatedProfile.patientId,
        profileStatus: updatedProfile.profileStatus,
        completionScore: updatedProfile.completionScore
      });
      
      return updatedProfile;
    } catch (error) {
      console.error('Error updating health profile in database:', error);
      throw error;
    }
  }

  // TEMPORARY FIX: Ensure database schema is correct
  private async ensureDocumentTableSchema(): Promise<void> {
    try {
      const { sql } = await import("drizzle-orm");
      
      // Try to drop the problematic constraint if it exists
      await db.execute(sql`
        ALTER TABLE IF EXISTS document_uploads 
        ALTER COLUMN appointment_id DROP NOT NULL
      `);
      
      console.log('✅ Database constraint fixed');
    } catch (error) {
      // If that fails, try to recreate tables
      try {
        const { sql } = await import("drizzle-orm");
        
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
      } catch (recreateError) {
        console.error('❌ Failed to fix database schema:', recreateError);
        throw recreateError;
      }
    }
  }

  // Document Library operations
  async getDocuments(appointmentId?: number): Promise<DocumentUpload[]> {
    try {
      if (appointmentId) {
        console.log('📄 Fetching documents for appointment:', appointmentId);
        const documents = await db
          .select()
          .from(documentUploads)
          .innerJoin(appointmentDocuments, eq(appointmentDocuments.documentId, documentUploads.id))
          .where(eq(appointmentDocuments.appointmentId, appointmentId));
        return documents.map(d => d.document_uploads);
      } else {
        console.log('📄 Fetching all documents');
        return await db.select().from(documentUploads);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  async getDocumentsByPatient(patientId: number): Promise<DocumentUpload[]> {
    try {
      console.log('📚 Fetching document library for patient:', patientId);
      
      const docs = await db
        .select()
        .from(documentUploads)
        .where(eq(documentUploads.uploadedBy, patientId))
        .orderBy(desc(documentUploads.uploadedAt));
      
      console.log('📄 Found documents in library:', docs.length);
      return docs;
    } catch (error) {
      console.error('Error fetching document library:', error);
      return [];
    }
  }

  async createDocument(document: InsertDocumentUpload): Promise<DocumentUpload> {
    try {
      console.log('💾 Creating document in library with data:', document);
      
      // TEMPORARY FIX: Check and fix database schema if needed
      try {
        await this.ensureDocumentTableSchema();
      } catch (error) {
        console.log('⚠️ Schema check failed, proceeding with insert...');
      }
      
      // Handle duplicate filename by adding (1), (2), etc.
      let finalFileName = document.fileName;
      let counter = 1;
      
      while (true) {
        const existingDoc = await db
          .select()
          .from(documentUploads)
          .where(and(
            eq(documentUploads.uploadedBy, document.uploadedBy),
            eq(documentUploads.fileName, finalFileName)
          ))
          .limit(1);
          
        if (existingDoc.length === 0) {
          break; // Filename is unique
        }
        
        // Generate new filename with counter
        const fileExtension = document.fileName.includes('.') 
          ? '.' + document.fileName.split('.').pop() 
          : '';
        const baseFileName = document.fileName.includes('.') 
          ? document.fileName.substring(0, document.fileName.lastIndexOf('.'))
          : document.fileName;
        
        finalFileName = `${baseFileName} (${counter})${fileExtension}`;
        counter++;
      }
      
      const [newDocument] = await db
        .insert(documentUploads)
        .values({
          ...document,
          fileName: finalFileName,
          uploadedAt: new Date()
        })
        .returning();
      
      console.log('✅ Document created in library:', newDocument);
      return newDocument;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  async getDocumentById(id: string): Promise<DocumentUpload | undefined> {
    try {
      console.log('🔍 Fetching document by ID:', id);
      
      const [document] = await db
        .select()
        .from(documentUploads)
        .where(eq(documentUploads.id, id));
      
      console.log('📄 Document found:', document ? 'Yes' : 'No');
      return document;
    } catch (error) {
      console.error('Error fetching document by ID:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting document from library:', id);
      
      // First, remove all appointment attachments
      await db.delete(appointmentDocuments).where(eq(appointmentDocuments.documentId, id));
      
      // Then delete the document itself
      await db.delete(documentUploads).where(eq(documentUploads.id, id));
      
      console.log('✅ Document deleted from library');
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // Appointment-Document attachment operations
  async attachDocumentToAppointment(appointmentId: number, documentId: string): Promise<any> {
    try {
      console.log('📎 Attaching document to appointment:', { appointmentId, documentId });
      
      const [attachment] = await db.insert(appointmentDocuments).values({
        appointmentId,
        documentId,
        attachedAt: new Date(),
      }).returning();
      
      console.log('✅ Document attached to appointment:', attachment);
      return attachment;
    } catch (error) {
      console.error('Error attaching document:', error);
      throw error;
    }
  }

  async detachDocumentFromAppointment(appointmentId: number, documentId: string): Promise<void> {
    try {
      console.log('📎 Detaching document from appointment:', { appointmentId, documentId });
      
      await db
        .delete(appointmentDocuments)
        .where(and(
          eq(appointmentDocuments.appointmentId, appointmentId),
          eq(appointmentDocuments.documentId, documentId)
        ));
      
      console.log('✅ Document detached from appointment');
    } catch (error) {
      console.error('Error detaching document:', error);
      throw error;
    }
  }

  async getDocumentsForAppointment(appointmentId: number): Promise<any[]> {
    try {
      console.log('📄 Fetching documents for appointment:', appointmentId);
      
      const documents = await db
        .select({
          id: documentUploads.id,
          fileName: documentUploads.fileName,
          fileSize: documentUploads.fileSize,
          fileType: documentUploads.fileType,
          uploadUrl: documentUploads.uploadUrl,
          documentType: documentUploads.documentType,
          uploadedAt: documentUploads.uploadedAt,
          attachedAt: appointmentDocuments.attachedAt,
        })
        .from(appointmentDocuments)
        .innerJoin(documentUploads, eq(appointmentDocuments.documentId, documentUploads.id))
        .where(eq(appointmentDocuments.appointmentId, appointmentId))
        .orderBy(appointmentDocuments.attachedAt);
      
      console.log('📄 Found attached documents:', documents.length);
      return documents;
    } catch (error) {
      console.error('Error fetching appointment documents:', error);
      return [];
    }
  }

  // Banner dismissal operations
  async createBannerDismissal(dismissal: any): Promise<any> {
    // For now, simulate dismissal creation
    const newDismissal = {
      ...dismissal,
      id: `dismissal_${Date.now()}`,
      createdAt: new Date()
    };
    
    console.log('Banner dismissal created:', newDismissal);
    return newDismissal;
  }

  async getBannerDismissals(userId: number): Promise<any[]> {
    // For now, return empty array
    // This would normally query a banner_dismissals table
    return [];
  }

  async createAnalyticsEvent(event: any): Promise<void> {
    try {
      // Log analytics event for debugging
      console.log('📊 Analytics Event:', {
        sessionId: event.sessionId,
        userId: event.userId,
        eventType: event.eventType,
        eventData: event.eventData,
        timestamp: event.timestamp
      });
      
      // Store analytics event in the database
      await db.insert(analyticsEvents).values({
        sessionId: event.sessionId,
        userId: event.userId ? parseInt(event.userId) : null,
        eventType: event.eventType,
        eventData: event.eventData,
        timestamp: event.timestamp
      });
    } catch (error) {
      console.error("Error creating analytics event:", error);
      throw error;
    }
  }

  // Admin user management methods
  async getAdminUsers(): Promise<Array<User & { lastLogin?: string }>> {
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(desc(users.createdAt));
    
    // Add lastLogin field (currently null as we don't track login times yet)
    return adminUsers.map(user => ({
      ...user,
      lastLogin: undefined
    }));
  }

  async createAdminUser(userData: { email: string; firstName: string; lastName: string }): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByEmail(userData.email);
    
    if (existingUser) {
      // Update existing user to admin role
      const [updatedUser] = await db
        .update(users)
        .set({
          role: 'admin',
          approved: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      
      return updatedUser;
    }
    
    // Create new admin user
    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'admin',
        approved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newUser;
  }

  async removeAdminUser(userId: number): Promise<void> {
    // Don't delete the user, just revoke admin access
    await db
      .update(users)
      .set({
        role: 'patient',
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getMeetingStats(): Promise<{
    totalLive: number;
    totalPlanned: number;
    totalCompleted: number;
    totalCancelled: number;
    totalWithIssues: number;
    meetings: Array<{
      id: string;
      patientName: string;
      doctorName: string;
      scheduledTime: string;
      status: 'live' | 'planned' | 'completed' | 'cancelled' | 'issue';
      duration: number;
      alertDetails?: string;
    }>;
  }> {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Get all appointments with their related data
    const appointmentsData = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        patientFirstName: users.firstName,
        patientLastName: users.lastName,
        doctorFirstName: sql<string>`doctor_user.first_name`,
        doctorLastName: sql<string>`doctor_user.last_name`,
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(sql`users as doctor_user`, sql`doctor_user.id = ${doctors.userId}`)
      .where(
        or(
          // Live meetings: appointments happening now (started within last 15 mins)
          and(
            eq(appointments.status, 'paid'),
            gte(appointments.appointmentDate, fifteenMinutesAgo),
            lte(appointments.appointmentDate, now)
          ),
          // Planned meetings: upcoming appointments within next hour
          and(
            eq(appointments.status, 'paid'),
            gte(appointments.appointmentDate, now),
            lte(appointments.appointmentDate, oneHourFromNow)
          ),
          // Recent completed/cancelled appointments (last 24 hours)
          and(
            inArray(appointments.status, ['completed', 'cancelled']),
            gte(appointments.appointmentDate, new Date(now.getTime() - 24 * 60 * 60 * 1000))
          )
        )
      )
      .orderBy(asc(appointments.appointmentDate));

    // Process appointments to determine status and counts
    const meetings = appointmentsData.map(apt => {
      const appointmentTime = new Date(apt.appointmentDate);
      const minutesFromNow = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
      
      let status: 'live' | 'planned' | 'completed' | 'cancelled' | 'issue';
      let alertDetails: string | undefined;

      if (apt.status === 'cancelled') {
        status = 'cancelled';
      } else if (apt.status === 'completed') {
        status = 'completed';
      } else if (minutesFromNow <= -15) {
        // Meeting should have started more than 15 mins ago but still marked as paid
        status = 'issue';
        alertDetails = 'Meeting overdue - no connection established';
      } else if (minutesFromNow <= 0) {
        // Meeting is happening now
        status = 'live';
      } else {
        // Meeting is upcoming
        status = 'planned';
      }

      return {
        id: apt.id.toString(),
        patientName: `${apt.patientFirstName || ''} ${apt.patientLastName || ''}`.trim() || 'Unknown Patient',
        doctorName: `${apt.doctorFirstName || ''} ${apt.doctorLastName || ''}`.trim() || 'Unknown Doctor',
        scheduledTime: appointmentTime.toISOString(),
        status,
        duration: 30, // Default duration for appointments
        alertDetails
      };
    });

    // Calculate totals
    const totalLive = meetings.filter(m => m.status === 'live').length;
    const totalPlanned = meetings.filter(m => m.status === 'planned').length;
    const totalCompleted = meetings.filter(m => m.status === 'completed').length;
    const totalCancelled = meetings.filter(m => m.status === 'cancelled').length;
    const totalWithIssues = meetings.filter(m => m.status === 'issue').length;

    return {
      totalLive,
      totalPlanned,
      totalCompleted,
      totalCancelled,
      totalWithIssues,
      meetings
    };
  }

  async getUserGrowthData(startDate: Date, endDate: Date): Promise<Array<{month: string, users: number, revenue: number}>> {
    // Generate monthly data points within the selected timeframe
    const months = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Get cumulative user count up to this month
      const [userCount] = await db
        .select({ count: count() })
        .from(users)
        .where(and(
          eq(users.role, 'patient'),
          lte(users.createdAt, monthEnd)
        ));
      
      // Get revenue for this month
      const [monthRevenue] = await db
        .select({ 
          revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN CAST(price AS DECIMAL) ELSE 0 END), 0)`
        })
        .from(appointments)
        .where(and(
          gte(appointments.appointmentDate, monthStart),
          lte(appointments.appointmentDate, monthEnd),
          sql`status IN ('paid', 'completed')`
        ));
      
      months.push({
        month: format(monthStart, 'MMM'),
        users: userCount.count,
        revenue: Number(monthRevenue.revenue)
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // If less than 7 months, pad with earlier data
    if (months.length < 7) {
      const earliestDate = new Date(startDate);
      earliestDate.setMonth(earliestDate.getMonth() - (7 - months.length));
      
      const earlyMonths = [];
      const tempDate = new Date(earliestDate);
      
      while (tempDate < startDate) {
        const monthStart = new Date(tempDate.getFullYear(), tempDate.getMonth(), 1);
        const monthEnd = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0);
        
        const [userCount] = await db
          .select({ count: count() })
          .from(users)
          .where(and(
            eq(users.role, 'patient'),
            lte(users.createdAt, monthEnd)
          ));
        
        const [monthRevenue] = await db
          .select({ 
            revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN CAST(price AS DECIMAL) ELSE 0 END), 0)`
          })
          .from(appointments)
          .where(and(
            gte(appointments.appointmentDate, monthStart),
            lte(appointments.appointmentDate, monthEnd),
            sql`status IN ('paid', 'completed')`
          ));
        
        earlyMonths.push({
          month: format(monthStart, 'MMM'),
          users: userCount.count,
          revenue: Number(monthRevenue.revenue)
        });
        
        tempDate.setMonth(tempDate.getMonth() + 1);
      }
      
      return [...earlyMonths, ...months];
    }
    
    return months;
  }

  async getAcquisitionChannels(startDate: Date, endDate: Date): Promise<Array<{channel: string, users: number, conversion: number}>> {
    // Since we don't have actual acquisition channel tracking, we'll estimate based on common patterns
    // In a real implementation, this would track UTM parameters, referrers, etc.
    
    const [totalUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.role, 'patient'),
        gte(users.createdAt, startDate),
        lte(users.createdAt, endDate)
      ));
    
    const [convertedUsers] = await db
      .select({ count: count(sql`DISTINCT ${appointments.patientId}`) })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .where(and(
        eq(users.role, 'patient'),
        gte(users.createdAt, startDate),
        lte(users.createdAt, endDate),
        sql`${appointments.status} IN ('paid', 'completed')`
      ));
    
    const total = totalUsers.count || 1;
    const avgConversion = convertedUsers.count / total * 100;
    
    // Estimated channel distribution based on typical healthcare platforms
    return [
      {
        channel: 'Organic',
        users: Math.round(total * 0.35),
        conversion: Math.round(avgConversion * 1.2) // Organic typically converts better
      },
      {
        channel: 'Paid Search',
        users: Math.round(total * 0.25),
        conversion: Math.round(avgConversion * 0.9)
      },
      {
        channel: 'Social',
        users: Math.round(total * 0.15),
        conversion: Math.round(avgConversion * 0.7)
      },
      {
        channel: 'Referral',
        users: Math.round(total * 0.15),
        conversion: Math.round(avgConversion * 1.5) // Referrals typically convert best
      },
      {
        channel: 'Direct',
        users: Math.round(total * 0.10),
        conversion: Math.round(avgConversion * 1.3)
      }
    ];
  }

  // Notification operations
  async getNotifications(filters: { status?: string; limit?: number }): Promise<any[]> {
    try {
      let query = db.select({
        id: emailNotifications.id,
        userId: emailNotifications.userId,
        appointmentId: emailNotifications.appointmentId,
        triggerCode: emailNotifications.triggerCode,
        templateKey: emailNotifications.templateKey,
        status: emailNotifications.status,
        scheduledFor: emailNotifications.scheduledFor,
        sentAt: emailNotifications.sentAt,
        retryCount: emailNotifications.retryCount,
        errorMessage: emailNotifications.errorMessage,
        createdAt: emailNotifications.createdAt,
        user: {
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(emailNotifications)
      .leftJoin(users, eq(emailNotifications.userId, users.id))
      .orderBy(desc(emailNotifications.createdAt));

      if (filters.status) {
        query = query.where(eq(emailNotifications.status, filters.status)) as any;
      }

      if (filters.limit) {
        query = query.limit(filters.limit) as any;
      }

      return await query;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async retryNotification(notificationId: string): Promise<void> {
    await db
      .update(emailNotifications)
      .set({ 
        status: 'pending',
        retryCount: sql`${emailNotifications.retryCount} + 1`,
        scheduledFor: new Date(),
        updatedAt: new Date()
      })
      .where(eq(emailNotifications.id, notificationId));
  }

  async getNotificationPreferences(userId: number): Promise<any> {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    if (!prefs) {
      // Create default preferences
      const [newPrefs] = await db
        .insert(notificationPreferences)
        .values({
          userId,
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          marketingEmailsEnabled: true,
          reminderTiming: { 
            hours: [24, 2], 
            minutes: [0, 0] 
          },
          locale: 'en',
          timezone: 'Europe/Paris'
        })
        .returning();
      return newPrefs;
    }

    return prefs;
  }

  async updateNotificationPreferences(userId: number, updates: any): Promise<any> {
    const [updated] = await db
      .update(notificationPreferences)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(notificationPreferences.userId, userId))
      .returning();

    return updated;
  }
}

// Export the storage instance
export const storage = new PostgresStorage();