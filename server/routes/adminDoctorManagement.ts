import { Router } from 'express';
import { db } from '../db';
import { users, doctors, doctorApplicationAudit, emailBlacklist } from '@shared/schema';
import { eq, and, sql, desc, or, ilike, inArray } from 'drizzle-orm';
import { notificationService, TriggerCode } from '../services/notificationService';
import crypto from 'crypto';

export const adminDoctorManagementRouter = Router();

/**
 * Middleware to check if user is admin
 * Checks database role (source of truth) instead of JWT role to handle role mismatches
 */
async function requireAdmin(req: any, res: any, next: any) {
  const session = req.session.supabaseSession;

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Query database for user's role (source of truth)
    const [user] = await db
      .select({ id: users.id, role: users.role, email: users.email })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    // Check if user has admin role in database
    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        debug: {
          dbRole: user.role,
          jwtRole: session.user.user_metadata?.role || session.user.role
        }
      });
    }

    // Store user info for downstream use
    req.user = user;
    next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ error: 'Failed to verify admin access' });
  }
}

// Apply admin middleware to all routes
adminDoctorManagementRouter.use(requireAdmin);

/**
 * GET /api/admin/doctors
 * List all doctors (for the "Active Doctors" tab)
 */
adminDoctorManagementRouter.get('/', async (req, res) => {
  try {
    const {
      status,
      search,
      page = '1',
      limit = '100',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions: any[] = [];

    // Filter by status (default to active doctors only)
    if (status && status !== 'all') {
      const statusArray = (status as string).split(',');
      conditions.push(inArray(doctors.status, statusArray));
    } else if (!status) {
      // Default: show only active doctors
      conditions.push(eq(doctors.status, 'active'));
    }

    // Search by name, email, or specialty
    if (search && typeof search === 'string') {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm),
          ilike(users.email, searchTerm),
          ilike(doctors.specialty, searchTerm)
        )
      );
    }

    // Build query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(whereClause);

    const totalCount = countResult?.count || 0;

    // Get paginated doctors
    const doctorsList = await db
      .select({
        id: doctors.id,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        specialty: doctors.specialty,
        licenseNumber: doctors.licenseNumber,
        licenseExpirationDate: doctors.licenseExpirationDate,
        countries: doctors.countries,
        status: doctors.status,
        bio: doctors.bio,
        consultationPrice: doctors.consultationPrice,
        rating: doctors.rating,
        reviewCount: doctors.reviewCount,
        profileCompletionPercentage: doctors.profileCompletionPercentage,
        profilePhoto: users.profileImageUrl,
        createdAt: users.createdAt,
        approvedAt: doctors.approvedAt,
        activatedAt: doctors.activatedAt,
        lastLoginAt: doctors.lastLoginAt
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(users.createdAt) : users.createdAt)
      .limit(limitNum)
      .offset(offset);

    return res.json({
      doctors: doctorsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error: any) {
    console.error('Error fetching doctors:', error);
    return res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

/**
 * GET /api/admin/doctors/applications
 * List all doctor applications with filtering and pagination
 */
adminDoctorManagementRouter.get('/applications', async (req, res) => {
  try {
    const {
      status,
      search,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions: any[] = [];

    // Filter by status
    if (status && status !== 'all') {
      const statusArray = (status as string).split(',');
      conditions.push(inArray(doctors.status, statusArray));
    }

    // Search by name, email, or license number
    if (search && typeof search === 'string') {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm),
          ilike(users.email, searchTerm),
          ilike(doctors.licenseNumber, searchTerm)
        )
      );
    }

    // Build query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(whereClause);

    const totalCount = countResult?.count || 0;

    // Get paginated applications
    const applications = await db
      .select({
        doctorId: doctors.id,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        specialty: doctors.specialty,
        licenseNumber: doctors.licenseNumber,
        licenseExpirationDate: doctors.licenseExpirationDate,
        licenseCountry: sql<string>`${doctors.countries}[1]`, // First country in array
        countries: doctors.countries,
        status: doctors.status,
        profileCompletionPercentage: doctors.profileCompletionPercentage,
        rejectionReason: doctors.rejectionReason,
        rejectionType: doctors.rejectionType,
        createdAt: users.createdAt,
        approvedAt: doctors.approvedAt,
        rejectedAt: doctors.rejectedAt,
        activatedAt: doctors.activatedAt,
        bio: doctors.bio,
        phone: users.phone
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(users.createdAt) : users.createdAt)
      .limit(limitNum)
      .offset(offset);

    return res.json({
      applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error: any) {
    console.error('Error fetching doctor applications:', error);
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * GET /api/admin/doctors/applications/:doctorId
 * Get detailed information about a specific doctor application
 */
adminDoctorManagementRouter.get('/applications/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Get doctor with user information
    const [application] = await db
      .select({
        doctorId: doctors.id,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        specialty: doctors.specialty,
        licenseNumber: doctors.licenseNumber,
        licenseExpirationDate: doctors.licenseExpirationDate,
        countries: doctors.countries,
        bio: doctors.bio,
        rppsNumber: doctors.rppsNumber,
        status: doctors.status,
        profileCompletionPercentage: doctors.profileCompletionPercentage,
        rejectionReason: doctors.rejectionReason,
        rejectionType: doctors.rejectionType,
        iban: doctors.iban,
        ibanVerificationStatus: doctors.ibanVerificationStatus,
        consultationPrice: doctors.consultationPrice,
        rating: doctors.rating,
        reviewCount: doctors.reviewCount,
        createdAt: users.createdAt,
        approvedAt: doctors.approvedAt,
        rejectedAt: doctors.rejectedAt,
        activatedAt: doctors.activatedAt,
        lastLoginAt: doctors.lastLoginAt,
        userApproved: users.approved
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.id, parseInt(doctorId)))
      .limit(1);

    if (!application) {
      return res.status(404).json({ error: 'Doctor application not found' });
    }

    // Get audit trail
    const auditTrail = await db
      .select({
        id: doctorApplicationAudit.id,
        oldStatus: doctorApplicationAudit.oldStatus,
        newStatus: doctorApplicationAudit.newStatus,
        reason: doctorApplicationAudit.reason,
        notes: doctorApplicationAudit.notes,
        ipAddress: doctorApplicationAudit.ipAddress,
        createdAt: doctorApplicationAudit.createdAt,
        adminId: doctorApplicationAudit.adminId,
        adminName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`
      })
      .from(doctorApplicationAudit)
      .leftJoin(users, eq(doctorApplicationAudit.adminId, users.id))
      .where(eq(doctorApplicationAudit.doctorId, parseInt(doctorId)))
      .orderBy(desc(doctorApplicationAudit.createdAt));

    return res.json({
      application,
      auditTrail
    });

  } catch (error: any) {
    console.error('Error fetching doctor application details:', error);
    return res.status(500).json({ error: 'Failed to fetch application details' });
  }
});

/**
 * Hash email for blacklist
 */
function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

/**
 * POST /api/admin/doctors/applications/:doctorId/approve
 * Approve a doctor application
 */
adminDoctorManagementRouter.post('/applications/:doctorId/approve', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { notes } = req.body;
    const session = req.session.supabaseSession;
    const adminId = session.user.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    // Get current doctor status
    const [doctor] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        status: doctors.status,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.id, parseInt(doctorId)))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor application not found' });
    }

    // Validate status transition
    if (doctor.status !== 'pending_review') {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: `Can only approve applications in pending_review status. Current status: ${doctor.status}`
      });
    }

    // Update doctor status to 'approved'
    await db
      .update(doctors)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        rejectionReason: null,
        rejectionType: null,
        rejectedAt: null
      })
      .where(eq(doctors.id, parseInt(doctorId)));

    // Update user approved flag
    await db
      .update(users)
      .set({ approved: true })
      .where(eq(users.id, doctor.userId));

    // Create audit log entry
    await db.insert(doctorApplicationAudit).values({
      doctorId: parseInt(doctorId),
      adminId: parseInt(adminId),
      oldStatus: 'pending_review',
      newStatus: 'approved',
      reason: 'Application approved by admin',
      notes: notes || null,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null
    });

    // Send approval email notification
    try {
      await notificationService.scheduleNotification({
        userId: doctor.userId,
        triggerCode: TriggerCode.DOCTOR_APP_APPROVED,
        scheduledFor: new Date(),
        mergeData: {
          first_name: doctor.firstName,
          last_name: doctor.lastName,
          dashboard_link: `${process.env.CLIENT_URL}/doctor/dashboard`,
          next_steps: 'Complete your profile to activate your account'
        }
      });
      console.log(`✅ Doctor approval email queued for user ${doctor.userId}`);
    } catch (emailError) {
      console.error('❌ Error queueing approval email:', emailError);
    }

    return res.json({
      success: true,
      message: 'Doctor application approved successfully',
      data: {
        doctorId: doctor.id,
        userId: doctor.userId,
        newStatus: 'approved',
        approvedAt: new Date()
      }
    });

  } catch (error: any) {
    console.error('Error approving doctor application:', error);
    return res.status(500).json({ error: 'Failed to approve application' });
  }
});

/**
 * POST /api/admin/doctors/applications/:doctorId/reject
 * Reject a doctor application (soft or hard)
 */
adminDoctorManagementRouter.post('/applications/:doctorId/reject', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { reason, rejectionType, notes } = req.body; // rejectionType: 'soft' or 'hard'
    const session = req.session.supabaseSession;
    const adminId = session.user.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    // Validate input
    if (!reason || !rejectionType) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['reason', 'rejectionType']
      });
    }

    if (!['soft', 'hard'].includes(rejectionType)) {
      return res.status(400).json({
        error: 'Invalid rejection type',
        message: 'rejectionType must be either "soft" or "hard"'
      });
    }

    // Get current doctor status
    const [doctor] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        status: doctors.status,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.id, parseInt(doctorId)))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor application not found' });
    }

    // Validate status transition
    if (!['pending_review', 'approved'].includes(doctor.status)) {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: `Can only reject applications in pending_review or approved status. Current status: ${doctor.status}`
      });
    }

    const newStatus = rejectionType === 'soft' ? 'rejected_soft' : 'rejected_hard';

    // Update doctor status
    await db
      .update(doctors)
      .set({
        status: newStatus,
        rejectionReason: reason,
        rejectionType,
        rejectedAt: new Date(),
        approvedAt: null
      })
      .where(eq(doctors.id, parseInt(doctorId)));

    // Update user approved flag
    await db
      .update(users)
      .set({ approved: false })
      .where(eq(users.id, doctor.userId));

    // Create audit log entry
    await db.insert(doctorApplicationAudit).values({
      doctorId: parseInt(doctorId),
      adminId: parseInt(adminId),
      oldStatus: doctor.status,
      newStatus,
      reason: `Application rejected (${rejectionType}): ${reason}`,
      notes: notes || null,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null
    });

    // If hard rejection, add email to blacklist
    if (rejectionType === 'hard') {
      const emailHash = hashEmail(doctor.email);

      try {
        await db.insert(emailBlacklist).values({
          emailHash,
          reason: `Hard rejection: ${reason}`,
          blacklistedBy: parseInt(adminId),
          expiresAt: null, // Permanent ban
          metadata: { doctorId: doctor.id, rejectedAt: new Date() }
        });
        console.log(`✅ Email blacklisted for doctor ${doctor.id}`);
      } catch (blacklistError: any) {
        // Ignore duplicate key errors (email already blacklisted)
        if (!blacklistError.message.includes('duplicate key')) {
          console.error('❌ Error adding to blacklist:', blacklistError);
        }
      }
    }

    // Send rejection email notification
    try {
      const triggerCode = rejectionType === 'soft'
        ? TriggerCode.DOCTOR_APP_REJECTED_SOFT
        : TriggerCode.DOCTOR_APP_REJECTED_HARD;

      await notificationService.scheduleNotification({
        userId: doctor.userId,
        triggerCode,
        scheduledFor: new Date(),
        mergeData: {
          first_name: doctor.firstName,
          last_name: doctor.lastName,
          rejection_reason: reason,
          can_reapply: rejectionType === 'soft' ? 'yes' : 'no',
          reapply_days: rejectionType === 'soft' ? '30' : 'never',
          support_email: 'support@doktu.co'
        }
      });
      console.log(`✅ Doctor rejection email queued for user ${doctor.userId}`);
    } catch (emailError) {
      console.error('❌ Error queueing rejection email:', emailError);
    }

    return res.json({
      success: true,
      message: `Doctor application ${rejectionType === 'soft' ? 'soft' : 'hard'} rejected successfully`,
      data: {
        doctorId: doctor.id,
        userId: doctor.userId,
        newStatus,
        rejectionType,
        rejectedAt: new Date(),
        canReapply: rejectionType === 'soft'
      }
    });

  } catch (error: any) {
    console.error('Error rejecting doctor application:', error);
    return res.status(500).json({ error: 'Failed to reject application' });
  }
});

/**
 * POST /api/admin/doctors/:doctorId/suspend
 * Suspend an active doctor account
 */
adminDoctorManagementRouter.post('/:doctorId/suspend', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { reason, notes } = req.body;
    const session = req.session.supabaseSession;
    const adminId = session.user.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (!reason) {
      return res.status(400).json({ error: 'Suspension reason is required' });
    }

    // Get current doctor status
    const [doctor] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        status: doctors.status,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.id, parseInt(doctorId)))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Can only suspend active doctors
    if (doctor.status !== 'active') {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: `Can only suspend active doctors. Current status: ${doctor.status}`
      });
    }

    // Update doctor status to suspended
    await db
      .update(doctors)
      .set({ status: 'suspended' })
      .where(eq(doctors.id, parseInt(doctorId)));

    // Update user approved flag
    await db
      .update(users)
      .set({ approved: false })
      .where(eq(users.id, doctor.userId));

    // Create audit log entry
    await db.insert(doctorApplicationAudit).values({
      doctorId: parseInt(doctorId),
      adminId: parseInt(adminId),
      oldStatus: 'active',
      newStatus: 'suspended',
      reason: `Account suspended: ${reason}`,
      notes: notes || null,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null
    });

    // Send suspension email notification
    try {
      await notificationService.scheduleNotification({
        userId: doctor.userId,
        triggerCode: TriggerCode.DOCTOR_ACCOUNT_SUSPENDED,
        scheduledFor: new Date(),
        mergeData: {
          first_name: doctor.firstName,
          last_name: doctor.lastName,
          suspension_reason: reason,
          support_email: 'support@doktu.co'
        }
      });
      console.log(`✅ Doctor suspension email queued for user ${doctor.userId}`);
    } catch (emailError) {
      console.error('❌ Error queueing suspension email:', emailError);
    }

    return res.json({
      success: true,
      message: 'Doctor account suspended successfully',
      data: {
        doctorId: doctor.id,
        userId: doctor.userId,
        newStatus: 'suspended'
      }
    });

  } catch (error: any) {
    console.error('Error suspending doctor account:', error);
    return res.status(500).json({ error: 'Failed to suspend account' });
  }
});

/**
 * POST /api/admin/doctors/:doctorId/reactivate
 * Reactivate a suspended doctor account
 */
adminDoctorManagementRouter.post('/:doctorId/reactivate', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { notes } = req.body;
    const session = req.session.supabaseSession;
    const adminId = session.user.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    // Get current doctor status
    const [doctor] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        status: doctors.status,
        profileCompletionPercentage: doctors.profileCompletionPercentage,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.id, parseInt(doctorId)))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Can only reactivate suspended doctors
    if (doctor.status !== 'suspended') {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: `Can only reactivate suspended doctors. Current status: ${doctor.status}`
      });
    }

    // Check profile completion before reactivating
    if (doctor.profileCompletionPercentage < 100) {
      return res.status(400).json({
        error: 'Profile incomplete',
        message: 'Doctor profile must be 100% complete before reactivation'
      });
    }

    // Update doctor status to active
    await db
      .update(doctors)
      .set({ status: 'active' })
      .where(eq(doctors.id, parseInt(doctorId)));

    // Update user approved flag
    await db
      .update(users)
      .set({ approved: true })
      .where(eq(users.id, doctor.userId));

    // Create audit log entry
    await db.insert(doctorApplicationAudit).values({
      doctorId: parseInt(doctorId),
      adminId: parseInt(adminId),
      oldStatus: 'suspended',
      newStatus: 'active',
      reason: 'Account reactivated by admin',
      notes: notes || null,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null
    });

    // Send reactivation email notification
    try {
      await notificationService.scheduleNotification({
        userId: doctor.userId,
        triggerCode: TriggerCode.DOCTOR_ACCOUNT_REACTIVATED,
        scheduledFor: new Date(),
        mergeData: {
          first_name: doctor.firstName,
          last_name: doctor.lastName,
          dashboard_link: `${process.env.CLIENT_URL}/doctor/dashboard`
        }
      });
      console.log(`✅ Doctor reactivation email queued for user ${doctor.userId}`);
    } catch (emailError) {
      console.error('❌ Error queueing reactivation email:', emailError);
    }

    return res.json({
      success: true,
      message: 'Doctor account reactivated successfully',
      data: {
        doctorId: doctor.id,
        userId: doctor.userId,
        newStatus: 'active'
      }
    });

  } catch (error: any) {
    console.error('Error reactivating doctor account:', error);
    return res.status(500).json({ error: 'Failed to reactivate account' });
  }
});

/**
 * GET /api/admin/doctors/statistics
 * Get doctor application statistics
 */
adminDoctorManagementRouter.get('/statistics', async (req, res) => {
  try {
    // Get counts by status
    const statusCounts = await db
      .select({
        status: doctors.status,
        count: sql<number>`count(*)::int`
      })
      .from(doctors)
      .groupBy(doctors.status);

    // Get recent applications (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentApplications] = await db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`);

    return res.json({
      statusCounts,
      recentApplications: recentApplications?.count || 0,
      generatedAt: new Date()
    });

  } catch (error: any) {
    console.error('Error fetching doctor statistics:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});
