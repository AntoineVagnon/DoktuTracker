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

    const [newUser] = await db.insert(users).values(cleanUserData).returning();
    return newUser;
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

    const [user] = await db.insert(users).values(cleanUserData).returning();
    return user;
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

  async getDoctor(id: string): Promise<(Doctor & { user: User }) | undefined> {
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
      .where(eq(doctors.id, id));

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
    await db
      .update(doctors)
      .set({ isOnline, updatedAt: new Date() })
      .where(eq(doctors.id, doctorId));
  }

  async getDoctorTimeSlots(doctorId: string, date?: string): Promise<TimeSlot[]> {
    let query = db.select().from(doctorTimeSlots).where(eq(doctorTimeSlots.doctorId, doctorId));
    
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query = query.where(
        and(
          gte(doctorTimeSlots.startTime, targetDate),
          lte(doctorTimeSlots.startTime, nextDay)
        )
      );
    }
    
    return await query.orderBy(asc(doctorTimeSlots.startTime));
  }

  async createTimeSlot(slot: InsertTimeSlot): Promise<TimeSlot> {
    const [newSlot] = await db.insert(doctorTimeSlots).values(slot).returning();
    return newSlot;
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

  async holdSlot(slotId: string, sessionId: string, durationMinutes: number): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    await db.insert(appointmentPending).values({
      id: nanoid(),
      timeSlotId: slotId,
      sessionId,
      expiresAt
    });
  }

  async releaseSlot(slotId: string): Promise<void> {
    await db.delete(appointmentPending).where(eq(appointmentPending.timeSlotId, slotId));
  }

  async releaseAllSlotsForSession(sessionId: string): Promise<void> {
    await db.delete(appointmentPending).where(eq(appointmentPending.sessionId, sessionId));
  }

  async getHeldSlot(sessionId: string): Promise<TimeSlot | undefined> {
    const [pending] = await db
      .select({
        slot: {
          id: doctorTimeSlots.id,
          doctorId: doctorTimeSlots.doctorId,
          startTime: doctorTimeSlots.startTime,
          endTime: doctorTimeSlots.endTime,
          isAvailable: doctorTimeSlots.isAvailable,
          isLocked: doctorTimeSlots.isLocked,
          lockedBy: doctorTimeSlots.lockedBy,
          lockedUntil: doctorTimeSlots.lockedUntil,
          createdAt: doctorTimeSlots.createdAt,
          updatedAt: doctorTimeSlots.updatedAt
        }
      })
      .from(appointmentPending)
      .innerJoin(doctorTimeSlots, eq(appointmentPending.timeSlotId, doctorTimeSlots.id))
      .where(eq(appointmentPending.sessionId, sessionId));

    return pending?.slot;
  }

  async getAppointments(patientId?: string, doctorId?: string): Promise<(Appointment & { doctor: Doctor & { user: User }, patient: User })[]> {
    const patientUsers = alias(users, 'patient_users');
    const doctorUsers = alias(users, 'doctor_users');
    
    const baseQuery = db
      .select({
        // Appointment fields
        id: appointments.id,
        doctorId: appointments.doctorId,
        patientId: appointments.patientId,
        slotId: appointments.timeSlotId,
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
            email: doctorUsers.email,
            title: doctorUsers.title,
            firstName: doctorUsers.firstName,
            lastName: doctorUsers.lastName,
            role: doctorUsers.role,
            approved: doctorUsers.approved,
            createdAt: doctorUsers.createdAt,
            updatedAt: doctorUsers.updatedAt
          }
        },
        // Patient info
        patient: {
          id: patientUsers.id,
          email: patientUsers.email,
          title: patientUsers.title,
          firstName: patientUsers.firstName,
          lastName: patientUsers.lastName,
          role: patientUsers.role,
          approved: patientUsers.approved,
          createdAt: patientUsers.createdAt,
          updatedAt: patientUsers.updatedAt
        }
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(doctorUsers, eq(doctors.userId, doctorUsers.id))
      .innerJoin(patientUsers, eq(sql`CAST(${appointments.patientId} AS INTEGER)`, patientUsers.id));

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
        slotId: appointments.timeSlotId,
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
            email: doctorUsers.email,
            title: doctorUsers.title,
            firstName: doctorUsers.firstName,
            lastName: doctorUsers.lastName,
            role: doctorUsers.role,
            approved: doctorUsers.approved,
            createdAt: doctorUsers.createdAt,
            updatedAt: doctorUsers.updatedAt
          }
        },
        // Patient info
        patient: {
          id: patientUsers.id,
          email: patientUsers.email,
          title: patientUsers.title,
          firstName: patientUsers.firstName,
          lastName: patientUsers.lastName,
          role: patientUsers.role,
          approved: patientUsers.approved,
          createdAt: patientUsers.createdAt,
          updatedAt: patientUsers.updatedAt
        }
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(doctorUsers, eq(doctors.userId, doctorUsers.id))
      .innerJoin(patientUsers, eq(sql`CAST(${appointments.patientId} AS INTEGER)`, patientUsers.id))
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
      before: { slotId: appointment.slotId },
      after: { slotId: newSlotId },
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
}

// Export the storage instance
export const storage = new PostgresStorage();