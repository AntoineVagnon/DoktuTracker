import {
  users,
  doctors,
  doctorTimeSlots,
  appointments,
  appointmentChanges,
  reviews,
  videoTests,
  auditEvents,
  type User,
  type UpsertUser,
  type Doctor,
  type InsertDoctor,
  type TimeSlot,
  type InsertTimeSlot,
  type Appointment,
  type InsertAppointment,
  type Review,
  type InsertReview,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, sql, ne } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Doctor operations
  async getDoctors(): Promise<(Doctor & { user: User })[]> {
    return await db
      .select()
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .orderBy(desc(doctors.rating), asc(doctors.createdAt));
  }

  async getDoctor(id: string): Promise<(Doctor & { user: User }) | undefined> {
    const [result] = await db
      .select()
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

  // Time slot operations
  async getDoctorTimeSlots(doctorId: string, date?: string): Promise<TimeSlot[]> {
    let query = db.select().from(doctorTimeSlots).where(eq(doctorTimeSlots.doctorId, doctorId));
    
    if (date) {
      query = query.where(and(
        eq(doctorTimeSlots.doctorId, doctorId),
        eq(doctorTimeSlots.date, date)
      ));
    }
    
    return await query.orderBy(asc(doctorTimeSlots.date), asc(doctorTimeSlots.startTime));
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

  // Appointment operations
  async getAppointments(patientId?: string, doctorId?: string): Promise<(Appointment & { doctor: Doctor & { user: User }, patient: User })[]> {
    let query = db
      .select()
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .innerJoin(users, eq(appointments.patientId, users.id));

    if (patientId) {
      query = query.where(eq(appointments.patientId, patientId));
    }
    if (doctorId) {
      query = query.where(eq(appointments.doctorId, doctorId));
    }

    return await query.orderBy(desc(appointments.appointmentDate));
  }

  async getAppointment(id: string): Promise<(Appointment & { doctor: Doctor & { user: User }, patient: User }) | undefined> {
    const [result] = await db
      .select()
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(users, eq(doctors.userId, users.id))
      .innerJoin(users, eq(appointments.patientId, users.id))
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
    return await db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.patientId, users.id))
      .where(eq(reviews.doctorId, doctorId))
      .orderBy(desc(reviews.createdAt));
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

  // Stripe operations
  async updateUserStripeInfo(userId: string, customerId?: string, subscriptionId?: string): Promise<User> {
    const updateData: Partial<User> = { updatedAt: new Date() };
    if (customerId) updateData.stripeCustomerId = customerId;
    if (subscriptionId) updateData.stripeSubscriptionId = subscriptionId;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();
