import {
  users,
  doctors,
  doctorTimeSlots,
  appointments,
  appointmentChanges,
  appointmentPending,
  reviews,
  auditEvents,
  payments,
  healthProfiles,
  documentUploads,
  appointmentDocuments,
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
import { eq, desc, asc, and, gte, lte, isNull, or, count, avg, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

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
  getTimeSlots(): Promise<TimeSlot[]>;
  createTimeSlot(slot: InsertTimeSlot): Promise<TimeSlot>;
  deleteTimeSlot(id: string): Promise<void>;
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
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: string, paymentIntentId?: string): Promise<void>;
  updateAppointmentPayment(id: string, paymentIntentId: string): Promise<void>;
  rescheduleAppointment(id: string, newSlotId: string, reason: string): Promise<void>;
  cancelAppointment(id: string, cancelledBy: string, reason: string): Promise<void>;
  
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
}

// PostgreSQL Storage Implementation
export class PostgresStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(id)));
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

    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const userId = parseInt(id);
    if (isNaN(userId)) {
      throw new Error('Invalid user ID');
    }

    await db.delete(users).where(eq(users.id, userId));
  }

  async getDoctors(): Promise<(Doctor & { user: User })[]> {
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

    return result;
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

  async getDoctorTimeSlots(doctorId: string | number, date?: string): Promise<TimeSlot[]> {
    const doctorIntId = typeof doctorId === 'string' ? parseInt(doctorId, 10) : doctorId;
    
    // Skip processing if doctorId is NaN/invalid
    if (isNaN(doctorIntId)) {
      console.log(`❌ Invalid doctor ID: ${doctorId}`);
      return [];
    }
    
    console.log(`🔍 Looking for time slots for doctor ID: ${doctorIntId}`);
    
    try {
      // Now using integer doctor_id - schema fixed!
      let query = db.select().from(doctorTimeSlots).where(eq(doctorTimeSlots.doctorId, doctorIntId));
      
      if (date) {
        query = query.where(eq(doctorTimeSlots.date, date)) as any;
      }
      
      const rawSlots = await query.orderBy(asc(doctorTimeSlots.date), asc(doctorTimeSlots.startTime));
      console.log(`📅 Found ${rawSlots.length} raw time slots for doctor ${doctorIntId}`);
      
      // Remove duplicates by date+startTime, keeping the most restrictive availability
      const uniqueSlots = rawSlots.reduce((acc: TimeSlot[], current: TimeSlot) => {
        const key = `${current.date}_${current.startTime}`;
        const existingIndex = acc.findIndex(slot => `${slot.date}_${slot.startTime}` === key);
        
        if (existingIndex === -1) {
          acc.push(current);
        } else {
          // Keep the slot that is NOT available (more restrictive) if one exists
          if (!current.isAvailable && acc[existingIndex].isAvailable) {
            acc[existingIndex] = current;
          }
        }
        return acc;
      }, []);
      
      console.log(`📅 After deduplication: ${uniqueSlots.length} unique slots for doctor ${doctorIntId}`);
      return uniqueSlots;
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

  async getAppointment(id: string): Promise<Appointment | undefined> {
    try {
      const [result] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, parseInt(id))); // Convert string to integer
      return result;
    } catch (error) {
      console.error("Error in getAppointment:", error);
      return undefined;
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

  async rescheduleAppointment(id: string, newSlotId: string, reason: string): Promise<void> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));

    await db
      .update(appointments)
      .set({ 
        timeSlotId: newSlotId, 
        rescheduleCount: (appointment.rescheduleCount || 0) + 1,
        updatedAt: new Date() 
      })
      .where(eq(appointments.id, id));

    // Log the change
    await db.insert(appointmentChanges).values({
      appointmentId: id,
      action: "reschedule",
      reason,
      before: { timeSlotId: appointment.slotId },
      after: { timeSlotId: newSlotId },
    });
  }

  async cancelAppointment(id: string, cancelledBy: string, reason: string): Promise<void> {
    await db
      .update(appointments)
      .set({ 
        status: "cancelled", 
        cancelledBy, 
        cancelReason: reason,
        updatedAt: new Date() 
      })
      .where(eq(appointments.id, id));

    // Log the change
    await db.insert(appointmentChanges).values({
      appointmentId: id,
      action: "cancel",
      reason,
      before: { status: "confirmed" },
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

  // Document Library operations
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
}

// Export the storage instance
export const storage = new PostgresStorage();