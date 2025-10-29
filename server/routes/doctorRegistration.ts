import { Router } from 'express';
import { supabase } from '../supabaseAuth';
import { db } from '../db';
import { users, doctors, doctorApplicationAudit, emailBlacklist } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notificationService, TriggerCode } from '../services/notificationService';
import crypto from 'crypto';

export const doctorRegistrationRouter = Router();

// EU Countries (27 member states)
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// Balkan Countries (7 countries)
const BALKAN_COUNTRIES = [
  'AL', // Albania
  'BA', // Bosnia and Herzegovina
  'XK', // Kosovo
  'ME', // Montenegro
  'MK', // North Macedonia
  'RS', // Serbia
  'TR'  // Turkey (partial Balkan region)
];

const ELIGIBLE_COUNTRIES = [...EU_COUNTRIES, ...BALKAN_COUNTRIES];

// In-memory rate limiting (simple implementation - consider Redis for production)
const registrationAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 3;

/**
 * Rate limiting middleware
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = registrationAttempts.get(ip);

  if (!record || now > record.resetAt) {
    registrationAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Hash email for blacklist checking (SHA-256)
 */
function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

/**
 * Validate license number format (basic validation)
 * Different countries have different formats, so we do basic checks
 */
function validateLicenseNumber(licenseNumber: string, country: string): { valid: boolean; error?: string } {
  if (!licenseNumber || licenseNumber.trim().length < 5) {
    return { valid: false, error: 'License number must be at least 5 characters' };
  }

  // French RPPS number validation (11 digits)
  if (country === 'FR') {
    const rppsRegex = /^\d{11}$/;
    if (!rppsRegex.test(licenseNumber)) {
      return { valid: false, error: 'French RPPS number must be 11 digits' };
    }
  }

  // Add more country-specific validations as needed

  return { valid: true };
}

/**
 * POST /api/doctor-registration/signup
 * Initial doctor registration - creates pending_review application
 */
doctorRegistrationRouter.post('/signup', async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    specialty,
    licenseNumber,
    licenseCountry,
    licenseExpirationDate,
    additionalCountries,
    rppsNumber,
    phone,
    bio,
    consultationPrice
  } = req.body;

  // Get IP address for rate limiting and audit
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    // 1. Rate limiting check
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        error: 'Too many registration attempts. Please try again later.',
        retryAfter: 3600 // seconds
      });
    }

    // 2. Validate required fields
    if (!email || !password || !firstName || !lastName || !specialty || !licenseNumber || !licenseCountry) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'firstName', 'lastName', 'specialty', 'licenseNumber', 'licenseCountry']
      });
    }

    // 3. Validate country eligibility
    if (!ELIGIBLE_COUNTRIES.includes(licenseCountry.toUpperCase())) {
      return res.status(400).json({
        error: 'Country not eligible',
        message: 'At this time, we only accept doctors licensed in EU member states and Balkan countries.',
        eligibleRegions: ['European Union (27 countries)', 'Balkan Region (7 countries)']
      });
    }

    // 4. Validate license number format
    const licenseValidation = validateLicenseNumber(licenseNumber, licenseCountry);
    if (!licenseValidation.valid) {
      return res.status(400).json({
        error: 'Invalid license number',
        message: licenseValidation.error
      });
    }

    // 5. Check email blacklist (for hard-rejected applications)
    const emailHash = hashEmail(email);
    const [blacklistEntry] = await db
      .select()
      .from(emailBlacklist)
      .where(
        and(
          eq(emailBlacklist.emailHash, emailHash),
          sql`(${emailBlacklist.expiresAt} IS NULL OR ${emailBlacklist.expiresAt} > NOW())`
        )
      )
      .limit(1);

    if (blacklistEntry) {
      return res.status(403).json({
        error: 'Registration not permitted',
        message: 'This email address is not eligible for registration. Please contact support if you believe this is an error.',
        supportEmail: 'support@doktu.co'
      });
    }

    // 6. Check for duplicate email in Supabase auth
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingAuthUser) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email address already exists.'
      });
    }

    // 7. Check for duplicate license number
    const [existingDoctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.licenseNumber, licenseNumber))
      .limit(1);

    if (existingDoctor) {
      return res.status(409).json({
        error: 'License number already registered',
        message: 'A doctor with this license number is already registered in our system.'
      });
    }

    // 8. Create Supabase auth user with 'doctor' role using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for doctor accounts
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'doctor'
      }
    });

    if (authError) {
      console.error('Supabase auth signup error:', authError);
      return res.status(400).json({
        error: 'Account creation failed',
        message: authError.message
      });
    }

    if (!authData.user) {
      return res.status(500).json({
        error: 'Account creation failed',
        message: 'Failed to create user account'
      });
    }

    // 9. Create user record in database
    // NOTE: Do NOT set id manually - let PostgreSQL auto-generate the serial id
    // The Supabase UUID is not used for database id (users.id is serial/INTEGER)
    const [newUser] = await db
      .insert(users)
      .values({
        email: authData.user.email!,
        firstName,
        lastName,
        role: 'doctor',
        approved: false, // Doctor accounts require admin approval
        emailVerified: false
      })
      .returning();

    // 10. Create doctor profile with pending_review status
    // Build countries array: start with primary, add additional countries if provided
    const allCountries = [
      licenseCountry.toUpperCase(),
      ...(additionalCountries && Array.isArray(additionalCountries)
        ? additionalCountries.map((c: string) => c.toUpperCase()).filter((c: string) => c !== licenseCountry.toUpperCase())
        : []
      )
    ];

    const [newDoctor] = await db
      .insert(doctors)
      .values({
        userId: newUser.id,
        specialty,
        licenseNumber,
        licenseExpirationDate: licenseExpirationDate ? new Date(licenseExpirationDate) : null,
        countries: allCountries,
        bio: bio || null,
        rppsNumber: rppsNumber || (licenseCountry === 'FR' ? licenseNumber : null), // Use provided RPPS or license number if French
        status: 'pending_review',
        profileCompletionPercentage: 0, // Will be calculated after profile completion
        consultationPrice: consultationPrice || '35.00', // Use provided price or default
        rating: '5.00',
        reviewCount: 0
      })
      .returning();

    // 11. Create audit log entry
    await db.insert(doctorApplicationAudit).values({
      doctorId: newDoctor.id,
      adminId: null,
      oldStatus: null,
      newStatus: 'pending_review',
      reason: 'Doctor registration submitted',
      notes: `Initial registration from IP: ${ip}`,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null
    });

    // 12. No email sent at registration - doctors receive DOCTOR_APP_APPROVED (D1) email when approved
    // The ACCOUNT_REG_SUCCESS template is for patients only (contains patient-specific onboarding)
    // Doctors see confirmation UI message and will receive proper welcome email upon admin approval
    console.log(`✅ Doctor application submitted - no email sent (waiting for admin approval)`);

    // 13. Return success response
    return res.status(201).json({
      success: true,
      message: 'Doctor application submitted successfully',
      data: {
        userId: newUser.id,
        doctorId: newDoctor.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        status: 'pending_review',
        specialty: newDoctor.specialty,
        nextSteps: [
          'Your application is now under review by our admin team',
          'You will receive an email notification within 2-3 business days',
          'Once approved, you will be able to complete your profile in the doctor dashboard',
          'After completing your profile 100%, your account will be activated and visible to patients'
        ]
      }
    });

  } catch (error: any) {
    console.error('Doctor registration error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    return res.status(500).json({
      error: 'Registration failed',
      message: error.message || 'An unexpected error occurred during registration. Please try again later.',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message })
    });
  }
});

/**
 * GET /api/doctor-registration/application-status
 * Check application status for logged-in doctor
 */
doctorRegistrationRouter.get('/application-status', async (req, res) => {
  try {
    const session = req.session.supabaseSession;

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get doctor record
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, session.user.id))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    // Get user record
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return res.json({
      status: doctor.status,
      profileCompletionPercentage: doctor.profileCompletionPercentage,
      rejectionReason: doctor.rejectionReason,
      rejectionType: doctor.rejectionType,
      rejectedAt: doctor.rejectedAt,
      approvedAt: doctor.approvedAt,
      activatedAt: doctor.activatedAt,
      canReapply: doctor.rejectionType === 'soft' && doctor.rejectedAt
        ? new Date().getTime() - new Date(doctor.rejectedAt).getTime() > 30 * 24 * 60 * 60 * 1000
        : false
    });

  } catch (error: any) {
    console.error('Application status check error:', error);
    return res.status(500).json({ error: 'Failed to retrieve application status' });
  }
});

/**
 * GET /api/doctor-registration/eligible-countries
 * Get list of eligible countries for doctor registration
 */
doctorRegistrationRouter.get('/eligible-countries', async (req, res) => {
  return res.json({
    countries: ELIGIBLE_COUNTRIES,
    regions: {
      eu: {
        name: 'European Union',
        count: EU_COUNTRIES.length,
        countries: EU_COUNTRIES
      },
      balkan: {
        name: 'Balkan Region',
        count: BALKAN_COUNTRIES.length,
        countries: BALKAN_COUNTRIES
      }
    }
  });
});
