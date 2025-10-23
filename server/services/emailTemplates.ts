// Email template definitions based on the provided specifications
import { format } from "date-fns";
import { 
  generateEmailHeader,
  generateEmailFooter,
  generateAppointmentCard,
  generateButtonGroup,
  generatePlainTextContent
} from './emailComponents';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// Helper function to get template by name
export function getTemplate(templateName: string, data: any): EmailTemplate {
  const templateFunction = templates[templateName];
  if (!templateFunction) {
    throw new Error(`Template '${templateName}' not found`);
  }
  return templateFunction(data);
}

// Template functions that generate email content with merged data
const templates: Record<string, (data: any) => EmailTemplate> = {
  welcome_free_credit: (data) => ({
    subject: "Welcome to DokTu – Your Health Advisory Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.first_name || 'Patient'},</p>
        
        <p>Welcome to DokTu! We're excited to have you join our health advisory platform.</p>
        
        <p>You can now book consultations with trusted doctors from various specialties – anytime, from anywhere.</p>
        
        <p>To get the most out of your experience:</p>
        <ul>
          <li>Complete your health profile now (takes less than 5 minutes).</li>
          <li>Upload any relevant medical records.</li>
          <li>Choose your preferred doctor and consultation time.</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.VITE_APP_URL}/patient/health-profile" 
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
            Complete My Health Profile
          </a>
        </div>
        
        <p>Need help getting started? Our support team is here for you.</p>
        
        <p>Thank you for trusting DokTu.</p>
        
        <p>Warm regards,<br>DokTu Team</p>
      </div>
    `
  }),

  welcome_doctor: (data) => ({
    subject: "Welcome to DokTu – Let's Start Helping Patients",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear Dr. ${data.last_name || 'Doctor'},</p>
        
        <p>We're pleased to welcome you to the DokTu platform. Thank you for joining our network of healthcare professionals.</p>
        
        <p>What's next?</p>
        <ul>
          <li>Log in and review your profile.</li>
          <li>Set your availability.</li>
          <li>Review the guidelines and documentation for consultations.</li>
        </ul>
        
        <p>Your profile is now live, and patients can begin scheduling appointments with you.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.VITE_APP_URL}/doctor/dashboard" 
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
            Go to My Dashboard
          </a>
        </div>
        
        <p>If you have any questions or need assistance, our support team is ready to help.</p>
        
        <p>Thank you for being part of DokTu.</p>
        
        <p>Best regards,<br>DokTu Team</p>
      </div>
    `
  }),

  profile_reminder: (data) => ({
    subject: "Complete Your DokTu Health Profile Before Your First Consultation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hi ${data.first_name || 'there'},</p>
        
        <p>We noticed that you haven't completed your health profile yet.</p>
        
        <p>Completing it helps doctors better understand your needs and offer more personalized advice.</p>
        
        <p>It only takes a few minutes, and it can make a big difference in the quality of your session.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.VITE_APP_URL}/patient/health-profile" 
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
            Complete My Health Profile
          </a>
        </div>
        
        <p>If you've already completed your profile or uploaded documents, feel free to ignore this message.</p>
        
        <p>See you soon on DokTu!</p>
        
        <p>DokTu Support Team</p>
      </div>
    `
  }),

  booking_confirmation: (data) => {

    const baseUrl = process.env.VITE_APP_URL || 'https://app.doktu.co';
    
    const appointmentData = {
      appointmentId: data.appointment_id,
      patientName: data.patient_first_name || 'Patient',
      doctorName: data.doctor_name,
      doctorSpecialization: data.doctor_specialization,
      appointmentDatetimeUtc: data.appointment_datetime_utc,
      timezone: data.patient_timezone || 'Europe/Paris',
      joinLink: data.join_link,
      price: data.price,
      currency: data.currency || '€'
    };

    const buttons = [
      {
        text: 'View in Dashboard',
        url: `${baseUrl}/patient/appointments/${data.appointment_id}`,
        style: 'primary' as const
      },
      {
        text: 'Reschedule',
        url: `${baseUrl}/patient/appointments/${data.appointment_id}?action=reschedule`,
        style: 'secondary' as const
      },
      {
        text: 'Cancel',
        url: `${baseUrl}/patient/appointments/${data.appointment_id}?action=cancel`,
        style: 'danger' as const
      }
    ];

    const html = 
      generateEmailHeader({ 
        preheaderText: `Your consultation with Dr. ${data.doctor_name} is confirmed` 
      }) +
      `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
          Your consultation is confirmed
        </h1>
        
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #475569;">
          Dear ${data.patient_first_name || 'Patient'},
        </p>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
          Your telemedicine consultation has been successfully booked and confirmed.
        </p>
        
        ${generateAppointmentCard(appointmentData)}
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #92400e;">
            Before your consultation:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #92400e;">
            <li>Join 2–5 minutes before the scheduled time</li>
            <li>Test your camera and microphone</li>
            <li>Ensure stable internet connection</li>
            <li>Find a quiet, private space</li>
            <li>Prepare any medical documents or questions</li>
          </ul>
        </div>
        
        <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1e293b;">
          Need to make changes?
        </h3>
        
        ${generateButtonGroup(buttons)}
        
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
          For technical support or questions, contact us at 
          <a href="mailto:support@doktu.co" style="color: #0369a1; text-decoration: underline;">support@doktu.co</a>
        </p>
        
        <p style="margin: 16px 0 0 0; font-size: 14px; color: #64748b;">
          Thank you for choosing Doktu Medical Platform.
        </p>
      ` +
      generateEmailFooter();

    const plainText = generatePlainTextContent({
      subject: "Your Consultation is Confirmed – Doktu",
      mainContent: `Dear ${data.patient_first_name || 'Patient'},\n\nYour telemedicine consultation has been successfully booked and confirmed.\n\nBEFORE YOUR CONSULTATION:\n- Join 2–5 minutes before the scheduled time\n- Test your camera and microphone\n- Ensure stable internet connection\n- Find a quiet, private space\n- Prepare any medical documents or questions\n\nFor technical support or questions, contact us at support@doktu.co\n\nThank you for choosing Doktu Medical Platform.`,
      buttons,
      appointmentData
    });

    return {
      subject: "Your Consultation is Confirmed – Doktu",
      html,
      text: plainText
    };
  },

  booking_reminder_24h: (data) => {

    const baseUrl = process.env.VITE_APP_URL || 'https://app.doktu.co';
    
    const appointmentData = {
      appointmentId: data.appointment_id,
      patientName: data.patient_first_name || 'Patient',
      doctorName: data.doctor_name,
      doctorSpecialization: data.doctor_specialization,
      appointmentDatetimeUtc: data.appointment_datetime_utc,
      timezone: data.patient_timezone || 'Europe/Paris',
      joinLink: data.join_link,
      price: data.price,
      currency: data.currency || '€'
    };

    const buttons = [
      {
        text: 'Join Video Call',
        url: data.join_link,
        style: 'primary' as const
      },
      {
        text: 'View Details',
        url: `${baseUrl}/patient/appointments/${data.appointment_id}`,
        style: 'secondary' as const
      }
    ];

    const html = 
      generateEmailHeader({ 
        preheaderText: `Reminder: Your consultation with Dr. ${data.doctor_name} is tomorrow` 
      }) +
      `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
          ⏰ Consultation reminder
        </h1>
        
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #475569;">
          Hi ${data.patient_first_name || 'there'},
        </p>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
          This is a friendly reminder that your consultation is scheduled for tomorrow.
        </p>
        
        ${generateAppointmentCard(appointmentData)}
        
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e40af;">
            Preparation checklist:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
            <li>✅ Test your camera and microphone in advance</li>
            <li>✅ Prepare any questions or medical documents</li>
            <li>✅ Find a quiet, well-lit space</li>
            <li>✅ Ensure stable internet connection</li>
            <li>✅ Have a glass of water nearby</li>
          </ul>
        </div>
        
        ${generateButtonGroup(buttons)}
        
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
          Need to reschedule or cancel? Visit your 
          <a href="${baseUrl}/patient/appointments" style="color: #0369a1; text-decoration: underline;">appointment dashboard</a>
          or contact our support team.
        </p>
        
        <p style="margin: 16px 0 0 0; font-size: 14px; color: #64748b;">
          We look forward to helping you with your healthcare needs.
        </p>
      ` +
      generateEmailFooter();

    const plainText = generatePlainTextContent({
      subject: "Reminder – Your Doktu Consultation is Tomorrow",
      mainContent: `Hi ${data.patient_first_name || 'there'},\n\nThis is a friendly reminder that your consultation is scheduled for tomorrow.\n\nPREPARATION CHECKLIST:\n✅ Test your camera and microphone in advance\n✅ Prepare any questions or medical documents\n✅ Find a quiet, well-lit space\n✅ Ensure stable internet connection\n✅ Have a glass of water nearby\n\nNeed to reschedule or cancel? Visit your appointment dashboard or contact our support team.\n\nWe look forward to helping you with your healthcare needs.`,
      buttons,
      appointmentData
    });

    return {
      subject: "Reminder – Your Doktu Consultation is Tomorrow",
      html,
      text: plainText
    };
  },

  cancellation_confirmation: (data) => {
    const baseUrl = process.env.VITE_APP_URL || 'https://app.doktu.co';
    
    const buttons = [
      {
        text: 'Book New Appointment',
        url: `${baseUrl}/doctors`,
        style: 'primary' as const
      },
      {
        text: 'View Dashboard',
        url: `${baseUrl}/patient/appointments`,
        style: 'secondary' as const
      }
    ];

    const html = 
      generateEmailHeader({ 
        preheaderText: `Your consultation with Dr. ${data.doctor_name} has been cancelled` 
      }) +
      `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
          Consultation cancelled
        </h1>
        
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #475569;">
          Dear ${data.patient_first_name || 'Patient'},
        </p>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
          Your consultation with Dr. ${data.doctor_name} has been cancelled.
        </p>
        
        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #991b1b;">
            Cancellation Details:
          </h3>
          <p style="margin: 0; color: #991b1b;">
            <strong>Original appointment:</strong> ${data.appointment_datetime_local || 'N/A'}<br>
            <strong>Doctor:</strong> Dr. ${data.doctor_name} (${data.doctor_specialization})<br>
            <strong>Reason:</strong> ${data.cancellation_reason || 'No reason provided'}
          </p>
        </div>
        
        <p style="margin: 24px 0; font-size: 16px; color: #475569;">
          If you paid for this consultation, any applicable refunds will be processed automatically within 3-5 business days.
        </p>
        
        <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1e293b;">
          What's next?
        </h3>
        
        ${generateButtonGroup(buttons)}
        
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
          If you have questions about this cancellation, contact us at 
          <a href="mailto:support@doktu.co" style="color: #0369a1; text-decoration: underline;">support@doktu.co</a>
        </p>
      ` +
      generateEmailFooter();

    const plainText = generatePlainTextContent({
      subject: "Your Consultation Has Been Cancelled",
      mainContent: `Dear ${data.patient_first_name || 'Patient'},\n\nYour consultation with Dr. ${data.doctor_name} has been cancelled.\n\nCANCELLATION DETAILS:\nOriginal appointment: ${data.appointment_datetime_local || 'N/A'}\nDoctor: Dr. ${data.doctor_name} (${data.doctor_specialization})\nReason: ${data.cancellation_reason || 'No reason provided'}\n\nIf you paid for this consultation, any applicable refunds will be processed automatically within 3-5 business days.\n\nIf you have questions about this cancellation, contact us at support@doktu.co`,
      buttons
    });

    return {
      subject: "Your Consultation Has Been Cancelled",
      html,
      text: plainText
    };
  },

  reschedule_confirmation: (data) => {
    const baseUrl = process.env.VITE_APP_URL || 'https://app.doktu.co';
    
    const appointmentData = {
      appointmentId: data.appointment_id,
      patientName: data.patient_first_name || 'Patient',
      doctorName: data.doctor_name,
      doctorSpecialization: data.doctor_specialization,
      appointmentDatetimeUtc: data.appointment_datetime_utc,
      timezone: data.patient_timezone || 'Europe/Paris',
      joinLink: data.join_link,
      price: data.price,
      currency: data.currency || '€'
    };

    const buttons = [
      {
        text: 'View in Dashboard',
        url: `${baseUrl}/patient/appointments/${data.appointment_id}`,
        style: 'primary' as const
      },
      {
        text: 'Join Video Call',
        url: data.join_link,
        style: 'secondary' as const
      }
    ];

    const html = 
      generateEmailHeader({ 
        preheaderText: `Your consultation with Dr. ${data.doctor_name} has been rescheduled` 
      }) +
      `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
          Consultation rescheduled
        </h1>
        
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #475569;">
          Dear ${data.patient_first_name || 'Patient'},
        </p>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
          Your consultation with Dr. ${data.doctor_name} has been successfully rescheduled.
        </p>
        
        ${data.old_appointment_datetime_utc ? `
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #92400e;">
            Previous appointment time:
          </h3>
          <p style="margin: 0; color: #92400e;">
            ${data.old_appointment_datetime_local || 'N/A'}
          </p>
        </div>
        ` : ''}
        
        ${generateAppointmentCard(appointmentData)}
        
        <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #15803d;">
            Important reminders:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #15803d;">
            <li>Your calendar has been automatically updated</li>
            <li>Join 2–5 minutes before the new scheduled time</li>
            <li>Test your camera and microphone beforehand</li>
            <li>All previous preparation instructions still apply</li>
          </ul>
        </div>
        
        ${generateButtonGroup(buttons)}
        
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
          If you need to make further changes, contact us at 
          <a href="mailto:support@doktu.co" style="color: #0369a1; text-decoration: underline;">support@doktu.co</a>
        </p>
      ` +
      generateEmailFooter();

    const plainText = generatePlainTextContent({
      subject: "Your Consultation Has Been Rescheduled",
      mainContent: `Dear ${data.patient_first_name || 'Patient'},\n\nYour consultation with Dr. ${data.doctor_name} has been successfully rescheduled.\n\n${data.old_appointment_datetime_local ? `Previous appointment time: ${data.old_appointment_datetime_local}\n\n` : ''}IMPORTANT REMINDERS:\n- Your calendar has been automatically updated\n- Join 2–5 minutes before the new scheduled time\n- Test your camera and microphone beforehand\n- All previous preparation instructions still apply\n\nIf you need to make further changes, contact us at support@doktu.co`,
      buttons,
      appointmentData
    });

    return {
      subject: "Your Consultation Has Been Rescheduled",
      html,
      text: plainText
    };
  },

  doctor_appointment_booked: (data) => ({
    subject: `New Appointment Booked - ${data.patient_first_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear Dr. ${data.doctor_name},</p>
        
        <p>A new appointment has been booked with you:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;">👤 <strong>Patient:</strong> ${data.patient_first_name}</p>
          <p style="margin: 5px 0;">📅 <strong>Date & Time:</strong> ${data.appointment_datetime_local}</p>
          <p style="margin: 5px 0;">🔗 <strong>Join Link:</strong> <a href="${data.join_link}">Secure Link</a></p>
        </div>
        
        <p>Please ensure you're available at the scheduled time.</p>
        
        <p>DokTu Support Team</p>
      </div>
    `
  }),

  doctor_appointment_cancelled: (data) => ({
    subject: `Appointment Cancelled - ${data.patient_first_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear Dr. ${data.doctor_name},</p>
        
        <p>The following appointment has been cancelled:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;">👤 <strong>Patient:</strong> ${data.patient_first_name}</p>
          <p style="margin: 5px 0;">📅 <strong>Original Date & Time:</strong> ${data.appointment_datetime_local}</p>
          <p style="margin: 5px 0;">💰 <strong>Price:</strong> €${data.price || '35'}</p>
        </div>
        
        <p>The time slot is now available for new bookings.</p>
        
        <p>DokTu Support Team</p>
      </div>
    `
  }),

  // SMS templates (shorter)

  post_call_survey: (data) => ({
    subject: "How was your consultation with Dr. ${data.doctor_name}?",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hi ${data.patient_first_name || 'there'},</p>
        
        <p>Thank you for completing your consultation with Dr. ${data.doctor_name}.</p>
        
        <p>Your feedback helps us improve our service. Please take a moment to rate your experience:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.VITE_APP_URL}/patient/appointments/${data.appointment_id}/review" 
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
            Rate Your Experience
          </a>
        </div>
        
        <p>Thank you for choosing DokTu.</p>
        
        <p>DokTu Team</p>
      </div>
    `
  }),

  doctor_no_show_patient: (data) => ({
    subject: "We're Sorry - Your Doctor Was Unable to Join",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.patient_first_name || 'Patient'},</p>
        
        <p>We sincerely apologize that Dr. ${data.doctor_name} was unable to join your scheduled consultation.</p>
        
        <p>We understand this is disappointing, and we're taking immediate action:</p>
        <ul>
          <li>Your payment will be fully refunded within 3-5 business days</li>
          <li>You can reschedule with any available doctor at no additional cost</li>
          <li>We're following up with the doctor to prevent future occurrences</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.VITE_APP_URL}/patient/book" 
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
            Book Another Consultation
          </a>
        </div>
        
        <p>We deeply apologize for any inconvenience caused.</p>
        
        <p>DokTu Support Team</p>
      </div>
    `
  }),

  // SMS templates (shorter)
  sms_doctor_10m: (data) => ({
    subject: "",
    html: `Reminder: Your consultation starts in 10 minutes. Please join: ${data.short_link}`
  }),

  // Push notification templates
  push_patient_5m: (data) => ({
    subject: "Consultation starting soon",
    html: `Your consultation with Dr. ${data.doctor_name} starts in 5 minutes. Tap to join.`
  }),

  doctor_upcoming_1h: (data) => ({
    subject: "Upcoming consultation",
    html: `You have a consultation with ${data.patient_name} in 1 hour.`
  }),

  // Universal Notification System templates
  account_registration_success: (data) => ({
    subject: "Welcome to Doktu – Your Health Advisory Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.first_name || 'Patient'},</p>
        
        <p>Welcome to Doktu! We're excited to have you join our health advisory platform.</p>
        
        <p>You can now book consultations with trusted doctors from various specialties – anytime, from anywhere.</p>
        
        <p>To get the most out of your experience:</p>
        <ul>
          <li>Complete your health profile now (takes less than 5 minutes).</li>
          <li>Upload any relevant medical records.</li>
          <li>Choose your preferred doctor and consultation time.</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.VITE_APP_URL}/dashboard" 
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
            Complete My Health Profile
          </a>
        </div>
        
        <p>Need help getting started? Our support team is here for you.</p>
        
        <p>Thank you for trusting Doktu.</p>
        
        <p>Warm regards,<br>Doktu Team</p>
      </div>
    `
  }),

  account_email_verification: (data) => ({
    subject: "Please verify your Doktu account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.first_name || 'Patient'},</p>
        
        <p>Please click the link below to verify your email address and complete your Doktu account setup:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verification_link}" 
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
            Verify Email Address
          </a>
        </div>
        
        <p>If you didn't create a Doktu account, please ignore this email.</p>
        
        <p>Best regards,<br>Doktu Team</p>
      </div>
    `
  }),

  health_profile_incomplete: (data) => ({
    subject: "Complete your health profile – it takes just 5 minutes",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.first_name || 'Patient'},</p>

        <p>We noticed your health profile is ${data.completion_percentage || '0'}% complete. Taking a few minutes to complete it will help your doctors provide better care.</p>

        <p><strong>What's missing:</strong></p>
        <ul>
          ${data.missing_fields ? data.missing_fields.map(field => `<li>${field}</li>`).join('') : '<li>Basic health information</li>'}
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.VITE_APP_URL}/dashboard"
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
            Complete Profile Now
          </a>
        </div>

        <p>A complete profile helps doctors understand your health better and provide more personalized care.</p>

        <p>Best regards,<br>Doktu Team</p>
      </div>
    `
  }),

  account_password_reset: (data) => ({
    subject: "Reset Your Doktu Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.first_name || 'User'},</p>

        <p>We received a request to reset your password for your Doktu account.</p>

        <p>Click the button below to reset your password:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.reset_link}"
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p>This link will expire in ${data.expiry_time || '1 hour'} for security reasons.</p>

        <p>If you didn't request this password reset, please ignore this email. Your password will not be changed.</p>

        <p>For security reasons, never share your password with anyone.</p>

        <p>Best regards,<br>Doktu Team</p>
      </div>
    `
  }),

  account_password_changed: (data) => ({
    subject: "Your Doktu Password Has Been Changed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.first_name || 'User'},</p>

        <p>This email confirms that your Doktu account password was successfully changed on ${data.changed_at || 'recently'}.</p>

        <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #15803d;">
            Security Details:
          </h3>
          <p style="margin: 0; color: #15803d;">
            <strong>Date & Time:</strong> ${data.changed_at || 'Just now'}<br>
            <strong>Device:</strong> ${data.device || 'Your device'}<br>
            <strong>Location:</strong> ${data.location || 'Your location'}
          </p>
        </div>

        <p><strong>If you made this change:</strong></p>
        <p>No further action is needed. Your account is secure.</p>

        <p><strong>If you did NOT make this change:</strong></p>
        <p style="color: #dc2626; font-weight: 600;">Your account may be compromised. Take these steps immediately:</p>
        <ol style="color: #dc2626;">
          <li>Reset your password again using a secure device</li>
          <li>Review your recent account activity</li>
          <li>Enable two-factor authentication</li>
          <li>Contact our support team at support@doktu.com</li>
        </ol>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.VITE_APP_URL}/security"
             style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Security Settings
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
          For your security, never share your password with anyone, including Doktu staff.
        </p>

        <p>Best regards,<br>Doktu Security Team</p>
      </div>
    `
  }),

  booking_payment_pending: (data) => ({
    subject: "Complete Your Payment – Your Appointment Slot is Reserved",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.patient_first_name || 'Patient'},</p>

        <p>You've successfully reserved an appointment slot with Dr. ${data.doctor_name}!</p>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #92400e;">
            ⏰ Action Required – Complete Payment Within 15 Minutes
          </h3>
          <p style="margin: 0; color: #92400e;">
            Your appointment slot is held for <strong>15 minutes</strong>. If payment is not completed by ${data.hold_expires_at || '15 minutes'}, this slot will be released and become available to other patients.
          </p>
        </div>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Doctor:</strong> Dr. ${data.doctor_name}</p>
          <p style="margin: 5px 0;"><strong>Specialization:</strong> ${data.doctor_specialization || 'General Practice'}</p>
          <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${data.appointment_datetime_local}</p>
          <p style="margin: 5px 0;"><strong>Price:</strong> ${data.currency || '€'}${data.price || '35'}</p>
          <p style="margin: 5px 0;"><strong>Hold Expires:</strong> ${data.hold_expires_at || 'In 15 minutes'}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.payment_link || process.env.VITE_APP_URL + '/patient/checkout/' + data.booking_id}"
             style="background-color: #dc2626; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 16px;">
            Complete Payment Now
          </a>
        </div>

        <p><strong>What happens after payment?</strong></p>
        <ul>
          <li>You'll receive instant confirmation</li>
          <li>Your appointment will be confirmed and locked in</li>
          <li>You'll get calendar reminders before your consultation</li>
          <li>You'll receive the video call link to join</li>
        </ul>

        <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
          <strong>Need help?</strong> Contact our support team at support@doktu.co or call us at ${data.support_phone || '+33 (0)1 XX XX XX XX'}.
        </p>

        <p>Best regards,<br>Doktu Team</p>
      </div>
    `
  }),

  membership_payment_failed: (data) => ({
    subject: "Urgent: Your Doktu Membership Payment Failed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.first_name || 'Member'},</p>

        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #991b1b;">
            ⚠️ Payment Failed – Action Required
          </h3>
          <p style="margin: 0; color: #991b1b;">
            We were unable to process your ${data.plan_name || 'membership'} payment. Your membership benefits may be interrupted if this is not resolved within ${data.grace_period_days || '3'} days.
          </p>
        </div>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Membership Plan:</strong> ${data.plan_name || 'Premium'}</p>
          <p style="margin: 5px 0;"><strong>Amount Due:</strong> ${data.currency || '€'}${data.amount || '29.99'}</p>
          <p style="margin: 5px 0;"><strong>Billing Period:</strong> ${data.billing_period || 'Monthly'}</p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${data.payment_method || 'Card ending in ****'}</p>
          <p style="margin: 5px 0;"><strong>Failure Reason:</strong> ${data.failure_reason || 'Payment declined'}</p>
        </div>

        <p><strong>Why did this happen?</strong></p>
        <ul>
          <li>Insufficient funds in your account</li>
          <li>Expired or invalid payment method</li>
          <li>Card issuer declined the transaction</li>
          <li>Billing address mismatch</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.update_payment_link || process.env.VITE_APP_URL + '/settings/billing'}"
             style="background-color: #dc2626; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 16px;">
            Update Payment Method
          </a>
        </div>

        <p><strong>What happens next?</strong></p>
        <ul>
          <li>We'll automatically retry payment in ${data.retry_days || '2'} days</li>
          <li>If payment fails ${data.max_retry_attempts || '3'} times, your membership will be suspended</li>
          <li>You can update your payment method now to avoid interruption</li>
          <li>Your membership benefits remain active during the ${data.grace_period_days || '3'}-day grace period</li>
        </ul>

        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e40af;">
            Need Help?
          </h3>
          <p style="margin: 0; color: #1e40af;">
            Contact your bank to authorize the payment, or update your payment method in your account settings. Our support team is available 24/7 at support@doktu.co.
          </p>
        </div>

        <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
          If you believe this is an error or need assistance, please contact us immediately at support@doktu.co or call ${data.support_phone || '+33 (0)1 XX XX XX XX'}.
        </p>

        <p>Best regards,<br>Doktu Billing Team</p>
      </div>
    `
  })
};

export async function getEmailTemplate(templateKey: string, mergeData: any): Promise<EmailTemplate> {
  const templateFunc = templates[templateKey];
  
  if (!templateFunc) {
    throw new Error(`Template not found: ${templateKey}`);
  }
  
  // Validate required merge fields
  const requiredFields = getRequiredFields(templateKey);
  for (const field of requiredFields) {
    if (!mergeData[field]) {
      throw new Error(`Missing required merge field: ${field} for template ${templateKey}`);
    }
  }
  
  return templateFunc(mergeData);
}

function getRequiredFields(templateKey: string): string[] {
  const fieldMap: Record<string, string[]> = {
    welcome_free_credit: ["first_name"],
    welcome_doctor: ["last_name"],
    profile_reminder: ["first_name"],
    booking_confirmation: ["patient_first_name", "appointment_datetime_local", "doctor_name", "join_link"],
    booking_reminder_24h: ["patient_first_name", "appointment_datetime_local", "doctor_name", "join_link"],
    cancellation_confirmation: ["patient_first_name", "doctor_name", "appointment_datetime_local"],
    reschedule_confirmation: ["patient_first_name", "new_appointment_datetime_local", "doctor_name", "join_link"],
    post_call_survey: ["patient_first_name", "doctor_name", "appointment_id"],
    doctor_no_show_patient: ["patient_first_name", "doctor_name"],
    sms_doctor_10m: ["short_link"],
    push_patient_5m: ["doctor_name"],
    doctor_upcoming_1h: ["patient_name"],
    // Universal Notification System templates
    account_registration_success: ["first_name"],
    account_email_verification: ["first_name", "verification_link"],
    health_profile_incomplete: ["first_name"],
    account_password_reset: ["first_name", "reset_link"]
  };

  return fieldMap[templateKey] || [];
}