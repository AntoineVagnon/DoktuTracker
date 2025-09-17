import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../supabaseAuth';
import { EmailService } from '../emailService';
import { getTemplate } from '../services/emailTemplates';
import { db } from '../db';
import { appointments, users, doctors } from '@shared/schema';
import { eq, and, gte, lt, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

// Admin authorization middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  // Check if user has admin role
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

const router = Router();

// Validation schemas - only use existing templates
const testEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.enum(['welcome_free_credit']).default('welcome_free_credit')
});

// POST /api/emails/test
router.post('/test', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    console.log('📧 Email test endpoint called');
    const { email, type } = testEmailSchema.parse(req.body);
    console.log('📧 Parsed request body:', { email, type });
    
    // Get email template
    const templateData = {
      first_name: 'Test User',
      last_name: 'Account'
    };
    console.log('📧 Template data prepared:', templateData);
    
    const template = getTemplate(type, templateData);
    console.log('📧 Template retrieved successfully');
    
    // Send test email using working email service
    console.log('📧 Creating EmailService instance');
    const emailService = new EmailService();
    console.log('📧 Calling sendWelcomeEmail');
    await emailService.sendWelcomeEmail({
      email,
      firstName: 'Test User',
      userType: 'patient'
    });
    
    res.json({
      success: true,
      message: `Test email sent successfully to ${email}`
    });
    
  } catch (error: any) {
    console.error('Test email error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to send test email: ' + error.message
    });
  }
});

// POST /api/emails/send-reminders
router.post('/send-reminders', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    // Get tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    
    // Create alias for doctor users to distinguish from patient users
    const doctorUsers = alias(users, 'doctorUsers');
    
    // Fetch appointments for tomorrow that are paid/confirmed
    const tomorrowAppointments = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        patient: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        },
        doctor: {
          id: doctors.id,
          title: doctorUsers.title,
          firstName: doctorUsers.firstName,
          lastName: doctorUsers.lastName,
          specialty: doctors.specialty
        }
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(doctorUsers, eq(doctors.userId, doctorUsers.id))
      .where(
        and(
          gte(appointments.appointmentDate, tomorrow),
          lt(appointments.appointmentDate, dayAfter),
          or(eq(appointments.status, 'paid'), eq(appointments.status, 'confirmed'))
        )
      );
    
    let sentCount = 0;
    const errors: string[] = [];
    
    // Send reminder email to each patient
    for (const appointment of tomorrowAppointments) {
      try {
        const templateData = {
          patient_first_name: appointment.patient.firstName,
          doctor_name: `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
          appointment_datetime_local: appointment.appointmentDate.toLocaleString('en-US', {
            timeZone: 'Europe/Paris',
            dateStyle: 'full',
            timeStyle: 'short'
          }),
          join_link: `${process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:5000'}/consultation/${appointment.id}`
        };
        
        // Use existing booking_reminder_24h template
        const template = getTemplate('booking_reminder_24h', templateData);
        
        const emailService = new EmailService();
        await emailService.sendAppointmentReminder({
          patientEmail: appointment.patient.email || '',
          patientName: appointment.patient.firstName || 'Patient',
          doctorName: `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
          specialty: appointment.doctor.specialty || '',
          appointmentDate: appointment.appointmentDate.toLocaleDateString(),
          appointmentTime: appointment.appointmentDate.toLocaleTimeString(),
          appointmentId: appointment.id.toString()
        });
        
        sentCount++;
      } catch (emailError: any) {
        console.error(`Failed to send reminder to ${appointment.patient.email}:`, emailError);
        errors.push(`Failed to send reminder to ${appointment.patient.email}: ${emailError.message}`);
      }
    }
    
    res.json({
      success: true,
      message: `Sent ${sentCount} reminder emails successfully`,
      count: sentCount,
      total: tomorrowAppointments.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error: any) {
    console.error('Send reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder emails: ' + error.message
    });
  }
});

export { router as emailRouter };