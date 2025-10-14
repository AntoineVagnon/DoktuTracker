import { Router } from 'express';
import { db } from '../db';
import { users, doctors, appointments } from '@shared/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { doctorProfileService } from '../services/doctorProfileService';

export const doctorDashboardRouter = Router();

/**
 * Middleware to check if user is a doctor
 */
function requireDoctor(req: any, res: any, next: any) {
  const session = req.session.supabaseSession;

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Check if user has doctor role
  if (session.user.user_metadata?.role !== 'doctor' && session.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Doctor access required' });
  }

  next();
}

// Apply doctor middleware to all routes
doctorDashboardRouter.use(requireDoctor);

/**
 * GET /api/doctor/dashboard
 * Get doctor dashboard overview
 */
doctorDashboardRouter.get('/dashboard', async (req, res) => {
  try {
    const session = req.session.supabaseSession;
    const userId = session.user.id;

    // Get doctor profile
    const [doctor] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        specialty: doctors.specialty,
        licenseNumber: doctors.licenseNumber,
        licenseExpirationDate: doctors.licenseExpirationDate,
        countries: doctors.countries,
        bio: doctors.bio,
        rppsNumber: doctors.rppsNumber,
        status: doctors.status,
        profileCompletionPercentage: doctors.profileCompletionPercentage,
        consultationPrice: doctors.consultationPrice,
        rating: doctors.rating,
        reviewCount: doctors.reviewCount,
        iban: doctors.iban,
        ibanVerificationStatus: doctors.ibanVerificationStatus,
        approvedAt: doctors.approvedAt,
        activatedAt: doctors.activatedAt,
        rejectionReason: doctors.rejectionReason,
        rejectionType: doctors.rejectionType,
        rejectedAt: doctors.rejectedAt
      })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    // Get user info
    const [user] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Get profile completion details
    const profileDetails = await doctorProfileService.getProfileCompletionDetails(doctor.id);

    // Get appointment statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const appointmentStats = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        upcoming: sql<number>`COUNT(*) FILTER (WHERE ${appointments.appointmentDate} > NOW() AND ${appointments.status} = 'paid')::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${appointments.appointmentDate} < NOW() AND ${appointments.status} = 'paid')::int`,
        cancelled: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'cancelled')::int`
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctor.id),
          gte(appointments.appointmentDate, thirtyDaysAgo)
        )
      );

    return res.json({
      doctor: {
        id: doctor.id,
        userId: doctor.userId,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        phone: user?.phone,
        specialty: doctor.specialty,
        licenseNumber: doctor.licenseNumber,
        licenseExpirationDate: doctor.licenseExpirationDate,
        countries: doctor.countries,
        bio: doctor.bio,
        rppsNumber: doctor.rppsNumber,
        status: doctor.status,
        profileCompletionPercentage: doctor.profileCompletionPercentage,
        consultationPrice: doctor.consultationPrice,
        rating: doctor.rating,
        reviewCount: doctor.reviewCount,
        iban: doctor.iban,
        ibanVerificationStatus: doctor.ibanVerificationStatus,
        approvedAt: doctor.approvedAt,
        activatedAt: doctor.activatedAt,
        rejectionReason: doctor.rejectionReason,
        rejectionType: doctor.rejectionType,
        rejectedAt: doctor.rejectedAt
      },
      profileCompletion: profileDetails,
      appointmentStats: appointmentStats[0] || {
        total: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0
      }
    });

  } catch (error: any) {
    console.error('Error fetching doctor dashboard:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/doctor/profile/completion
 * Get detailed profile completion information
 */
doctorDashboardRouter.get('/profile/completion', async (req, res) => {
  try {
    const session = req.session.supabaseSession;
    const userId = session.user.id;

    // Get doctor ID
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const profileDetails = await doctorProfileService.getProfileCompletionDetails(doctor.id);

    return res.json(profileDetails);

  } catch (error: any) {
    console.error('Error fetching profile completion:', error);
    return res.status(500).json({ error: 'Failed to fetch profile completion data' });
  }
});

/**
 * PUT /api/doctor/profile
 * Update doctor profile
 */
doctorDashboardRouter.put('/profile', async (req, res) => {
  try {
    const session = req.session.supabaseSession;
    const userId = session.user.id;

    const {
      firstName,
      lastName,
      phone,
      specialty,
      bio,
      consultationPrice,
      countries,
      licenseExpirationDate,
      iban
    } = req.body;

    // Get doctor ID
    const [doctor] = await db
      .select({ id: doctors.id, status: doctors.status })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    // Update user info
    if (firstName || lastName || phone) {
      await db
        .update(users)
        .set({
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone && { phone })
        })
        .where(eq(users.id, userId));
    }

    // Update doctor info
    const doctorUpdates: any = {};
    if (specialty) doctorUpdates.specialty = specialty;
    if (bio) doctorUpdates.bio = bio;
    if (consultationPrice) doctorUpdates.consultationPrice = consultationPrice;
    if (countries) doctorUpdates.countries = countries;
    if (licenseExpirationDate) doctorUpdates.licenseExpirationDate = new Date(licenseExpirationDate);
    if (iban) {
      doctorUpdates.iban = iban;
      // Reset verification status when IBAN is changed
      doctorUpdates.ibanVerificationStatus = 'pending';
    }

    if (Object.keys(doctorUpdates).length > 0) {
      await db
        .update(doctors)
        .set(doctorUpdates)
        .where(eq(doctors.id, doctor.id));
    }

    // Recalculate profile completion
    const completionResult = await doctorProfileService.updateProfileCompletion(doctor.id, userId);

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      profileCompletion: completionResult
    });

  } catch (error: any) {
    console.error('Error updating doctor profile:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /api/doctor/profile/iban/verify
 * Request IBAN verification
 */
doctorDashboardRouter.post('/profile/iban/verify', async (req, res) => {
  try {
    const session = req.session.supabaseSession;
    const userId = session.user.id;

    const { iban } = req.body;

    if (!iban) {
      return res.status(400).json({ error: 'IBAN is required' });
    }

    // Get doctor ID
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    // Basic IBAN validation (length and format)
    const ibanClean = iban.replace(/\s/g, '').toUpperCase();
    if (ibanClean.length < 15 || ibanClean.length > 34) {
      return res.status(400).json({
        error: 'Invalid IBAN format',
        message: 'IBAN must be between 15 and 34 characters'
      });
    }

    // Update IBAN and set status to pending
    await db
      .update(doctors)
      .set({
        iban: ibanClean,
        ibanVerificationStatus: 'pending'
      })
      .where(eq(doctors.id, doctor.id));

    // TODO: Integrate with actual IBAN verification service
    // For now, we'll auto-verify valid IBANs
    // In production, this would trigger a verification workflow

    // Simulate verification (remove in production)
    if (ibanClean.length >= 15) {
      await db
        .update(doctors)
        .set({
          ibanVerificationStatus: 'verified'
        })
        .where(eq(doctors.id, doctor.id));

      // Recalculate profile completion
      await doctorProfileService.updateProfileCompletion(doctor.id, userId);

      return res.json({
        success: true,
        message: 'IBAN verified successfully',
        ibanVerificationStatus: 'verified'
      });
    }

    return res.json({
      success: true,
      message: 'IBAN verification requested',
      ibanVerificationStatus: 'pending'
    });

  } catch (error: any) {
    console.error('Error verifying IBAN:', error);
    return res.status(500).json({ error: 'Failed to verify IBAN' });
  }
});

/**
 * GET /api/doctor/appointments
 * Get doctor's appointments
 */
doctorDashboardRouter.get('/appointments', async (req, res) => {
  try {
    const session = req.session.supabaseSession;
    const userId = session.user.id;

    const { status: statusFilter, from, to, limit = '20', page = '1' } = req.query;

    // Get doctor ID
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions: any[] = [eq(appointments.doctorId, doctor.id)];

    if (statusFilter) {
      conditions.push(eq(appointments.status, statusFilter as string));
    }

    if (from) {
      conditions.push(gte(appointments.appointmentDate, new Date(from as string)));
    }

    if (to) {
      conditions.push(sql`${appointments.appointmentDate} <= ${new Date(to as string)}`);
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(whereClause);

    const totalCount = countResult?.count || 0;

    // Get appointments with patient info
    const appointmentsList = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        patientFirstName: users.firstName,
        patientLastName: users.lastName,
        patientEmail: users.email,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        price: appointments.price,
        zoomMeetingId: appointments.zoomMeetingId,
        zoomJoinUrl: appointments.zoomJoinUrl,
        createdAt: appointments.createdAt
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .where(whereClause)
      .orderBy(desc(appointments.appointmentDate))
      .limit(limitNum)
      .offset(offset);

    return res.json({
      appointments: appointmentsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error: any) {
    console.error('Error fetching doctor appointments:', error);
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

/**
 * GET /api/doctor/status
 * Get current account status and next steps
 */
doctorDashboardRouter.get('/status', async (req, res) => {
  try {
    const session = req.session.supabaseSession;
    const userId = session.user.id;

    // Get doctor profile
    const [doctor] = await db
      .select({
        id: doctors.id,
        status: doctors.status,
        profileCompletionPercentage: doctors.profileCompletionPercentage,
        rejectionReason: doctors.rejectionReason,
        rejectionType: doctors.rejectionType,
        rejectedAt: doctors.rejectedAt,
        approvedAt: doctors.approvedAt,
        activatedAt: doctors.activatedAt
      })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    // Determine next steps based on status
    let nextSteps: string[] = [];
    let canTakeAction = false;

    switch (doctor.status) {
      case 'pending_review':
        nextSteps = [
          'Your application is under review by our admin team',
          'You will receive an email notification within 2-3 business days',
          'No action required at this time'
        ];
        break;

      case 'approved':
        nextSteps = [
          `Complete your profile (currently ${doctor.profileCompletionPercentage}%)`,
          'Add your professional bio',
          'Set your consultation price',
          'Verify your IBAN for payment processing',
          'Once your profile is 100% complete, your account will be automatically activated'
        ];
        canTakeAction = true;
        break;

      case 'active':
        nextSteps = [
          'Your account is fully activated!',
          'Set your availability schedule',
          'Start accepting patient consultations',
          'Manage your upcoming appointments'
        ];
        canTakeAction = true;
        break;

      case 'suspended':
        nextSteps = [
          'Your account has been suspended',
          'Please contact support@doktu.co for assistance',
          'No action available at this time'
        ];
        break;

      case 'rejected_soft':
        const canReapply = doctor.rejectedAt
          ? new Date().getTime() - new Date(doctor.rejectedAt).getTime() > 30 * 24 * 60 * 60 * 1000
          : false;

        nextSteps = [
          `Your application was rejected: ${doctor.rejectionReason}`,
          canReapply
            ? 'You can submit a new application after 30 days'
            : `You can reapply after ${new Date(new Date(doctor.rejectedAt!).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
          'Contact support@doktu.co if you have questions'
        ];
        canTakeAction = canReapply;
        break;

      case 'rejected_hard':
        nextSteps = [
          `Your application was permanently rejected: ${doctor.rejectionReason}`,
          'This email address is not eligible for registration',
          'Contact support@doktu.co if you believe this is an error'
        ];
        break;
    }

    return res.json({
      status: doctor.status,
      profileCompletionPercentage: doctor.profileCompletionPercentage,
      rejectionReason: doctor.rejectionReason,
      rejectionType: doctor.rejectionType,
      rejectedAt: doctor.rejectedAt,
      approvedAt: doctor.approvedAt,
      activatedAt: doctor.activatedAt,
      nextSteps,
      canTakeAction
    });

  } catch (error: any) {
    console.error('Error fetching doctor status:', error);
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
});
