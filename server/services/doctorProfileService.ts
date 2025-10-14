import { db } from '../db';
import { doctors, users, doctorApplicationAudit } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { notificationService, TriggerCode } from './notificationService';

/**
 * Doctor Profile Completion Service
 * Handles profile completion percentage calculation and state transitions
 */

// Required fields for profile completion
interface ProfileCompletionFields {
  // Basic Info (20%)
  firstName: boolean;
  lastName: boolean;
  email: boolean;
  phone: boolean;

  // Medical Credentials (30%)
  specialty: boolean;
  licenseNumber: boolean;
  licenseExpirationDate: boolean;
  countries: boolean; // At least one country

  // Professional Details (20%)
  bio: boolean;
  consultationPrice: boolean;

  // Financial Setup (30%)
  iban: boolean;
  ibanVerificationStatus: boolean; // Must be 'verified'
}

export class DoctorProfileService {

  /**
   * Calculate profile completion percentage
   * Returns percentage (0-100) and missing fields
   */
  async calculateProfileCompletion(doctorId: number): Promise<{
    percentage: number;
    missingFields: string[];
    completedFields: string[];
  }> {
    // Get doctor and user data
    const [doctorData] = await db
      .select({
        // User fields
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        // Doctor fields
        specialty: doctors.specialty,
        licenseNumber: doctors.licenseNumber,
        licenseExpirationDate: doctors.licenseExpirationDate,
        countries: doctors.countries,
        bio: doctors.bio,
        consultationPrice: doctors.consultationPrice,
        iban: doctors.iban,
        ibanVerificationStatus: doctors.ibanVerificationStatus
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.id, doctorId))
      .limit(1);

    if (!doctorData) {
      throw new Error(`Doctor ${doctorId} not found`);
    }

    // Define field weights (total = 100%)
    const fieldWeights = {
      // Basic Info (20%)
      firstName: 5,
      lastName: 5,
      email: 5,
      phone: 5,

      // Medical Credentials (30%)
      specialty: 10,
      licenseNumber: 10,
      licenseExpirationDate: 5,
      countries: 5,

      // Professional Details (20%)
      bio: 10,
      consultationPrice: 10,

      // Financial Setup (30%)
      iban: 15,
      ibanVerificationStatus: 15
    };

    const completedFields: string[] = [];
    const missingFields: string[] = [];
    let totalScore = 0;

    // Check each field
    Object.entries(fieldWeights).forEach(([field, weight]) => {
      const value = doctorData[field as keyof typeof doctorData];
      let isComplete = false;

      switch (field) {
        case 'firstName':
        case 'lastName':
        case 'email':
        case 'specialty':
        case 'licenseNumber':
        case 'bio':
          isComplete = !!value && value.toString().trim().length > 0;
          break;

        case 'phone':
          isComplete = !!value && value.toString().trim().length >= 10;
          break;

        case 'licenseExpirationDate':
          isComplete = !!value && new Date(value) > new Date();
          break;

        case 'countries':
          isComplete = Array.isArray(value) && value.length > 0;
          break;

        case 'consultationPrice':
          isComplete = !!value && parseFloat(value.toString()) > 0;
          break;

        case 'iban':
          isComplete = !!value && value.toString().trim().length >= 15;
          break;

        case 'ibanVerificationStatus':
          isComplete = value === 'verified';
          break;
      }

      if (isComplete) {
        completedFields.push(field);
        totalScore += weight;
      } else {
        missingFields.push(field);
      }
    });

    return {
      percentage: totalScore,
      missingFields,
      completedFields
    };
  }

  /**
   * Update profile completion and check for state transitions
   */
  async updateProfileCompletion(doctorId: number, userId?: number): Promise<{
    percentage: number;
    previousPercentage: number;
    statusChanged: boolean;
    newStatus?: string;
  }> {
    // Get current doctor status
    const [currentDoctor] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        status: doctors.status,
        profileCompletionPercentage: doctors.profileCompletionPercentage,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.id, doctorId))
      .limit(1);

    if (!currentDoctor) {
      throw new Error(`Doctor ${doctorId} not found`);
    }

    const previousPercentage = currentDoctor.profileCompletionPercentage;
    const previousStatus = currentDoctor.status;

    // Calculate new completion percentage
    const { percentage, missingFields } = await this.calculateProfileCompletion(doctorId);

    // Update profile completion percentage
    await db
      .update(doctors)
      .set({
        profileCompletionPercentage: percentage
      })
      .where(eq(doctors.id, doctorId));

    // Check for state transitions
    let statusChanged = false;
    let newStatus = previousStatus;

    // Transition from 'approved' to 'active' when profile is 100% complete
    if (previousStatus === 'approved' && percentage === 100) {
      newStatus = 'active';
      statusChanged = true;

      // Update status to active
      await db
        .update(doctors)
        .set({
          status: 'active',
          activatedAt: new Date()
        })
        .where(eq(doctors.id, doctorId));

      // Update user approved flag
      await db
        .update(users)
        .set({ approved: true })
        .where(eq(users.id, currentDoctor.userId));

      // Create audit log entry
      await db.insert(doctorApplicationAudit).values({
        doctorId,
        adminId: userId ? parseInt(userId.toString()) : null,
        oldStatus: 'approved',
        newStatus: 'active',
        reason: 'Profile 100% complete - account automatically activated',
        notes: `Profile completion increased from ${previousPercentage}% to ${percentage}%`,
        ipAddress: null,
        userAgent: null
      });

      // Send activation email
      try {
        await notificationService.scheduleNotification({
          userId: currentDoctor.userId,
          triggerCode: TriggerCode.DOCTOR_PROFILE_ACTIVATION_COMPLETE,
          scheduledFor: new Date(),
          mergeData: {
            first_name: currentDoctor.firstName,
            last_name: currentDoctor.lastName,
            dashboard_link: `${process.env.CLIENT_URL}/doctor/dashboard`,
            profile_url: `${process.env.CLIENT_URL}/doctors/${doctorId}`
          }
        });
        console.log(`✅ Doctor activation email queued for user ${currentDoctor.userId}`);
      } catch (emailError) {
        console.error('❌ Error queueing activation email:', emailError);
      }
    }

    // Log if profile completion dropped below 100% for an active doctor
    if (previousStatus === 'active' && percentage < 100) {
      console.warn(`⚠️ Doctor ${doctorId} profile completion dropped to ${percentage}%. Missing: ${missingFields.join(', ')}`);

      // Create audit log
      await db.insert(doctorApplicationAudit).values({
        doctorId,
        adminId: null,
        oldStatus: 'active',
        newStatus: 'active',
        reason: 'Profile completion warning',
        notes: `Profile completion dropped from ${previousPercentage}% to ${percentage}%. Missing fields: ${missingFields.join(', ')}`,
        ipAddress: null,
        userAgent: null
      });
    }

    return {
      percentage,
      previousPercentage,
      statusChanged,
      newStatus: statusChanged ? newStatus : undefined
    };
  }

  /**
   * Get profile completion details for doctor dashboard
   */
  async getProfileCompletionDetails(doctorId: number): Promise<{
    percentage: number;
    status: string;
    canActivate: boolean;
    missingFields: Array<{
      field: string;
      label: string;
      category: string;
      weight: number;
    }>;
    completedFields: string[];
  }> {
    const [doctor] = await db
      .select({
        status: doctors.status,
        profileCompletionPercentage: doctors.profileCompletionPercentage
      })
      .from(doctors)
      .where(eq(doctors.id, doctorId))
      .limit(1);

    if (!doctor) {
      throw new Error(`Doctor ${doctorId} not found`);
    }

    const { percentage, missingFields, completedFields } = await this.calculateProfileCompletion(doctorId);

    // Field metadata for UI display
    const fieldMetadata: Record<string, { label: string; category: string; weight: number }> = {
      firstName: { label: 'First Name', category: 'Basic Info', weight: 5 },
      lastName: { label: 'Last Name', category: 'Basic Info', weight: 5 },
      email: { label: 'Email Address', category: 'Basic Info', weight: 5 },
      phone: { label: 'Phone Number', category: 'Basic Info', weight: 5 },
      specialty: { label: 'Medical Specialty', category: 'Medical Credentials', weight: 10 },
      licenseNumber: { label: 'License Number', category: 'Medical Credentials', weight: 10 },
      licenseExpirationDate: { label: 'License Expiration Date', category: 'Medical Credentials', weight: 5 },
      countries: { label: 'Licensed Countries', category: 'Medical Credentials', weight: 5 },
      bio: { label: 'Professional Bio', category: 'Professional Details', weight: 10 },
      consultationPrice: { label: 'Consultation Price', category: 'Professional Details', weight: 10 },
      iban: { label: 'IBAN (Bank Account)', category: 'Financial Setup', weight: 15 },
      ibanVerificationStatus: { label: 'IBAN Verification', category: 'Financial Setup', weight: 15 }
    };

    const missingFieldsDetails = missingFields.map(field => ({
      field,
      ...fieldMetadata[field]
    }));

    return {
      percentage,
      status: doctor.status,
      canActivate: doctor.status === 'approved' && percentage === 100,
      missingFields: missingFieldsDetails,
      completedFields
    };
  }

  /**
   * Check if doctor profile meets activation requirements
   */
  async canActivateProfile(doctorId: number): Promise<{
    canActivate: boolean;
    reason?: string;
    percentage: number;
  }> {
    const [doctor] = await db
      .select({
        status: doctors.status,
        profileCompletionPercentage: doctors.profileCompletionPercentage
      })
      .from(doctors)
      .where(eq(doctors.id, doctorId))
      .limit(1);

    if (!doctor) {
      return { canActivate: false, reason: 'Doctor not found', percentage: 0 };
    }

    const { percentage } = await this.calculateProfileCompletion(doctorId);

    if (doctor.status !== 'approved') {
      return {
        canActivate: false,
        reason: `Account status is '${doctor.status}'. Only approved accounts can be activated.`,
        percentage
      };
    }

    if (percentage < 100) {
      return {
        canActivate: false,
        reason: `Profile is ${percentage}% complete. Must be 100% to activate.`,
        percentage
      };
    }

    return {
      canActivate: true,
      percentage
    };
  }

  /**
   * Manually trigger profile activation (for testing or admin override)
   */
  async activateProfile(doctorId: number, adminId?: number): Promise<void> {
    const { canActivate, reason } = await this.canActivateProfile(doctorId);

    if (!canActivate) {
      throw new Error(reason || 'Cannot activate profile');
    }

    // Force update to trigger state transition
    await this.updateProfileCompletion(doctorId, adminId);
  }
}

export const doctorProfileService = new DoctorProfileService();
