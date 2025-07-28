import {
  users,
  doctors,
  doctorTimeSlots,
  appointments,
  appointmentChanges,
  appointmentPending,
  reviews,
  auditEvents,
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

  // Custom auth operations for booking flow
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;

  // Doctor operations
  getDoctors(): Promise<(Doctor & { user: User })[]>;
  getDoctor(id: string): Promise<(Doctor & { user: User }) | undefined>;
  getDoctorByUserId(userId: string): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctorOnlineStatus(doctorId: string, isOnline: boolean): Promise<void>;

  // Time slot operations
  getDoctorTimeSlots(doctorId: string, date?: string): Promise<TimeSlot[]>;
  createTimeSlot(slot: InsertTimeSlot): Promise<TimeSlot>;
  deleteTimeSlot(id: string): Promise<void>;
  lockTimeSlot(id: string, lockedBy: string, durationMinutes: number): Promise<void>;
  unlockTimeSlot(id: string): Promise<void>;
  unlockExpiredSlots(): Promise<void>;
  
  // Slot holding operations (for booking flow)
  holdSlot(slotId: string, sessionId: string, durationMinutes: number): Promise<void>;
  releaseSlot(slotId: string): Promise<void>;
  releaseAllSlotsForSession(sessionId: string): Promise<void>;
  getHeldSlot(sessionId: string): Promise<TimeSlot | undefined>;

  // Appointment operations
  getAppointments(patientId?: string, doctorId?: string): Promise<(Appointment & { doctor: Doctor & { user: User }, patient: User })[]>;
  getAppointment(id: string): Promise<(Appointment & { doctor: Doctor & { user: User }, patient: User }) | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: string): Promise<void>;
  updateAppointmentPayment(id: string, paymentIntentId: string): Promise<void>;
  rescheduleAppointment(id: string, newSlotId: string, reason: string): Promise<void>;
  cancelAppointment(id: string, cancelledBy: string, reason: string): Promise<void>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getDoctorReviews(doctorId: string): Promise<(Review & { patient: User })[]>;

  // Admin operations
  getKPIs(): Promise<{
    totalAppointments: number;
    completedAppointments: number;
    noShowRate: number;
    averageRating: number;
    totalRevenue: number;
    newPatientsThisMonth: number;
  }>;

  // Stripe operations
  updateUserStripeInfo(userId: string, customerId?: string, subscriptionId?: string): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Supabase Auth)
  async getUser(id: string | number): Promise<User | undefined> {
    // Try to find user by ID (integer) - this will work with existing users
    const [user] = await db.select().from(users).where(eq(users.id, Number(id)));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First, try to find user by email (in case they already exist)
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      return existingUser;
    }

    // Create new user with structured name fields only
    if (!userData.email) {
      throw new Error('Email is required');
    }
    
    const cleanUserData = {
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

    const [user] = await db
      .insert(users)
      .values(cleanUserData)
      .returning();
    return user;
  }

  async getUserByEmail(email: string | null | undefined): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    // Create user with structured name fields only
    if (!userData.email) {
      throw new Error('Email is required');
    }
    
    const cleanUserData = {
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

    const [user] = await db
      .insert(users)
      .values(cleanUserData)
      .returning();
    return user;
  }

  // Doctor operations
  async getDoctors(): Promise<(Doctor & { user: User })[]> {
    const results = await db
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
        // User fields with structured names - using actual database columns
        user: {
          id: users.id,
          username: sql`NULL`.as('username'), // Removed from database
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
      .orderBy(desc(doctors.rating), asc(doctors.createdAt));
    
    // Return results with structured name support
    return results;
  }

  async getDoctor(id: string): Promise<(Doctor & { user: User }) | undefined> {
    const [result] = await db
      .select({
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
          username: sql`NULL`.as('username'), // Removed from database
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
      .where(eq(doctors.id, id));
    
    if (!result) return undefined;
    
    // Return result with structured name support
    return result;
  }

  async getDoctorByUserId(userId: string): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return doctor;
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [newDoctor] = await db.insert(doctors).values(doctor).returning();
    return newDoctor;
  }

  async updateDoctorOnlineStatus(doctorId: string, isOnline: boolean): Promise<void> {
    // Skip updating isOnline since column doesn't exist in database
    // This method is kept for compatibility but does nothing
    console.log(`Skipping isOnline update for doctor ${doctorId} - column not in database schema`);
  }

  // Time slot operations
  async getDoctorTimeSlots(doctorId: string, date?: string): Promise<TimeSlot[]> {
    let baseQuery = db.select().from(doctorTimeSlots);

    if (date) {
      return await baseQuery
        .where(and(
          eq(doctorTimeSlots.doctorId, doctorId),
          eq(doctorTimeSlots.date, date)
        ))
        .orderBy(asc(doctorTimeSlots.date), asc(doctorTimeSlots.startTime));
    }

    return await baseQuery
      .where(eq(doctorTimeSlots.doctorId, doctorId))
      .orderBy(asc(doctorTimeSlots.date), asc(doctorTimeSlots.startTime));
  }

  async createTimeSlot(slot: InsertTimeSlot): Promise<TimeSlot> {
    const [newSlot] = await db.insert(doctorTimeSlots).values(slot).returning();
    return newSlot;
  }

  async deleteTimeSlot(id: string): Promise<void> {
    await db.delete(doctorTimeSlots).where(eq(doctorTimeSlots.id, id));
  }

  async lockTimeSlot(id: string, lockedBy: string, durationMinutes: number): Promise<void> {
    const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    await db
      .update(doctorTimeSlots)
      .set({ lockedUntil, lockedBy })
      .where(eq(doctorTimeSlots.id, id));
  }

  async unlockTimeSlot(id: string): Promise<void> {
    await db
      .update(doctorTimeSlots)
      .set({ lockedUntil: null, lockedBy: null })
      .where(eq(doctorTimeSlots.id, id));
  }

  async unlockExpiredSlots(): Promise<void> {
    await db
      .update(doctorTimeSlots)
      .set({ lockedUntil: null, lockedBy: null })
      .where(lte(doctorTimeSlots.lockedUntil, new Date()));
  }

  // Slot holding operations (for booking flow)
  async holdSlot(slotId: string, sessionId: string, durationMinutes: number = 15): Promise<void> {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + durationMinutes);

    // First release any other slots held by this session
    await this.releaseAllSlotsForSession(sessionId);

    // Hold the new slot
    await db
      .update(doctorTimeSlots)
      .set({ 
        lockedUntil, 
        lockedBy: sessionId 
      })
      .where(
        and(
          eq(doctorTimeSlots.id, slotId),
          eq(doctorTimeSlots.isAvailable, true),
          or(
            isNull(doctorTimeSlots.lockedUntil),
            lte(doctorTimeSlots.lockedUntil, new Date())
          )
        )
      );

    // Note: appointmentPending table creation skipped due to database migration issues
    // This will be added back once the database schema is properly synced
  }

  async releaseSlot(slotId: string): Promise<void> {
    await db
      .update(doctorTimeSlots)
      .set({ 
        lockedUntil: null, 
        lockedBy: null 
      })
      .where(eq(doctorTimeSlots.id, slotId));

    // Note: appointmentPending cleanup skipped due to database migration issues
  }

  async releaseAllSlotsForSession(sessionId: string): Promise<void> {
    await db
      .update(doctorTimeSlots)
      .set({ 
        lockedUntil: null, 
        lockedBy: null 
      })
      .where(eq(doctorTimeSlots.lockedBy, sessionId));

    // Note: appointmentPending cleanup skipped due to database migration issues
  }

  async getHeldSlot(sessionId: string): Promise<TimeSlot | undefined> {
    const [slot] = await db
      .select()
      .from(doctorTimeSlots)
      .where(
        and(
          eq(doctorTimeSlots.lockedBy, sessionId),
          gte(doctorTimeSlots.lockedUntil, new Date())
        )
      );
    return slot;
  }

  // Appointment operations
  async getAppointments(patientId?: string, doctorId?: string): Promise<(Appointment & { doctor: Doctor & { user: User }, patient: User })[]> {
    const patientUsers = alias(users, 'patient_users');
    const doctorUsers = alias(users, 'doctor_users');
    
    let baseQuery = db
      .select({
        // Appointment fields
        id: appointments.id,
        doctorId: appointments.doctorId,
        patientId: appointments.patientId,
        slotId: appointments.slotId,
        status: appointments.status,
        appointmentDate: appointments.appointmentDate,
        price: appointments.price,
        paymentIntentId: appointments.paymentIntentId,
        notes: appointments.notes,
        cancelReason: appointments.cancelReason,
        cancelledBy: appointments.cancelledBy,
        videoRoomId: appointments.videoRoomId,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        // Doctor with user info
        doctor: {
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
            id: doctorUsers.id,
            username: doctorUsers.username,
            email: doctorUsers.email,
            role: doctorUsers.role,
            approved: doctorUsers.approved,
            createdAt: doctorUsers.createdAt,
            updatedAt: doctorUsers.updatedAt
          }
        },
        // Patient info
        patient: {
          id: patientUsers.id,
          username: patientUsers.username,
          email: patientUsers.email,
          role: patientUsers.role,
          approved: patientUsers.approved,
          createdAt: patientUsers.createdAt,
          updatedAt: patientUsers.updatedAt
        }
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(doctorUsers, eq(doctors.userId, doctorUsers.id))
      .innerJoin(patientUsers, eq(appointments.patientId, sql`CAST(${patientUsers.id} AS TEXT)`));

    let query = baseQuery;
    if (patientId) {
      query = query.where(eq(appointments.patientId, patientId));
    }
    if (doctorId) {
      query = query.where(eq(appointments.doctorId, doctorId));
    }

    return await query.orderBy(desc(appointments.appointmentDate));
  }

  async getAppointment(id: string): Promise<(Appointment & { doctor: Doctor & { user: User }, patient: User }) | undefined> {
    const patientUsers = alias(users, 'patient_users');
    const doctorUsers = alias(users, 'doctor_users');
    
    const [result] = await db
      .select({
        // Appointment fields
        id: appointments.id,
        doctorId: appointments.doctorId,
        patientId: appointments.patientId,
        slotId: appointments.slotId,
        status: appointments.status,
        appointmentDate: appointments.appointmentDate,
        price: appointments.price,
        paymentIntentId: appointments.paymentIntentId,
        notes: appointments.notes,
        cancelReason: appointments.cancelReason,
        cancelledBy: appointments.cancelledBy,
        videoRoomId: appointments.videoRoomId,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        // Doctor with user info
        doctor: {
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
            id: doctorUsers.id,
            username: doctorUsers.username,
            email: doctorUsers.email,
            role: doctorUsers.role,
            approved: doctorUsers.approved,
            createdAt: doctorUsers.createdAt,
            updatedAt: doctorUsers.updatedAt
          }
        },
        // Patient info
        patient: {
          id: patientUsers.id,
          username: patientUsers.username,
          email: patientUsers.email,
          role: patientUsers.role,
          approved: patientUsers.approved,
          createdAt: patientUsers.createdAt,
          updatedAt: patientUsers.updatedAt
        }
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(doctorUsers, eq(doctors.userId, doctorUsers.id))
      .innerJoin(patientUsers, eq(appointments.patientId, sql`CAST(${patientUsers.id} AS TEXT)`))
      .where(eq(appointments.id, id));
    return result;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointmentStatus(id: string, status: string): Promise<void> {
    await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id));
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
        slotId: newSlotId, 
        rescheduleCount: (appointment.rescheduleCount || 0) + 1,
        updatedAt: new Date() 
      })
      .where(eq(appointments.id, id));

    // Log the change
    await db.insert(appointmentChanges).values({
      appointmentId: id,
      action: "reschedule",
      reason,
      before: { slotId: appointment.slotId },
      after: { slotId: newSlotId },
    });
  }

  async cancelAppointment(id: string, cancelledBy: string, reason: string): Promise<void> {
    await db
      .update(appointments)
      .set({ status: "cancelled", cancelledBy, updatedAt: new Date() })
      .where(eq(appointments.id, id));

    // Log the change
    await db.insert(appointmentChanges).values({
      appointmentId: id,
      action: "cancel",
      actorRole: cancelledBy,
      reason,
    });
  }

  // Review operations
  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();

    // Update doctor's average rating
    const avgRating = await db
      .select({ avg: sql<number>`AVG(${reviews.rating})` })
      .from(reviews)
      .where(eq(reviews.doctorId, review.doctorId));

    const count = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reviews)
      .where(eq(reviews.doctorId, review.doctorId));

    await db
      .update(doctors)
      .set({ 
        rating: avgRating[0].avg?.toFixed(2) || "5.00",
        reviewCount: count[0].count || 0,
        updatedAt: new Date() 
      })
      .where(eq(doctors.id, review.doctorId));

    return newReview;
  }

  async getDoctorReviews(doctorId: string): Promise<(Review & { patient: User })[]> {
    const results = await db
      .select({
        // Review fields
        id: reviews.id,
        doctorId: reviews.doctorId,
        patientId: reviews.patientId,
        appointmentId: reviews.appointmentId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        // Patient info
        patient: {
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          approved: users.approved,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        }
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.patientId, sql`CAST(${users.id} AS TEXT)`))
      .where(eq(reviews.doctorId, doctorId))
      .orderBy(desc(reviews.createdAt));
    
    return results;
  }

  // Admin operations
  async getKPIs(): Promise<{
    totalAppointments: number;
    completedAppointments: number;
    noShowRate: number;
    averageRating: number;
    totalRevenue: number;
    newPatientsThisMonth: number;
  }> {
    const totalAppointments = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(appointments);

    const completedAppointments = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(appointments)
      .where(eq(appointments.status, "completed"));

    const avgRating = await db
      .select({ avg: sql<number>`AVG(${reviews.rating})` })
      .from(reviews);

    const revenue = await db
      .select({ sum: sql<number>`SUM(${appointments.price})` })
      .from(appointments)
      .where(eq(appointments.status, "completed"));

    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newPatients = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${appointments.patientId})` })
      .from(appointments)
      .where(gte(appointments.createdAt, thisMonth));

    const noShowCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(appointments)
      .where(eq(appointments.status, "cancelled"));

    const total = totalAppointments[0].count || 0;
    const completed = completedAppointments[0].count || 0;
    const noShow = noShowCount[0].count || 0;

    return {
      totalAppointments: total,
      completedAppointments: completed,
      noShowRate: total > 0 ? (noShow / total) * 100 : 0,
      averageRating: avgRating[0].avg || 5.0,
      totalRevenue: revenue[0].sum || 0,
      newPatientsThisMonth: newPatients[0].count || 0,
    };
  }

  // Stripe operations - simplified since columns don't exist in current schema
  async updateUserStripeInfo(userId: string, customerId?: string, subscriptionId?: string): Promise<User> {
    const updateData = { updatedAt: new Date() };
    // Note: stripeCustomerId and stripeSubscriptionId columns don't exist in current schema
    // Would need schema migration to add these fields

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, Number(userId)))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();