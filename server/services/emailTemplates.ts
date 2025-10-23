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

  booking_reminder_1h: (data) => {
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
        text: 'Join Video Call Now',
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
        preheaderText: `Your consultation starts in 1 hour! Join Dr. ${data.doctor_name}`
      }) +
      `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #dc2626;">
          ⏰ Consultation starting in 1 hour!
        </h1>

        <p style="margin: 0 0 16px 0; font-size: 16px; color: #475569;">
          Hi ${data.patient_first_name || 'there'},
        </p>

        <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
          Your telemedicine consultation with Dr. ${data.doctor_name} starts in approximately <strong>1 hour</strong>.
        </p>

        ${generateAppointmentCard(appointmentData)}

        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #991b1b;">
            🚨 Final checks before joining:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
            <li>✅ <strong>Test your camera and microphone</strong> – Make sure they're working properly</li>
            <li>✅ <strong>Check your internet connection</strong> – Close unnecessary apps and tabs</li>
            <li>✅ <strong>Find a quiet, private space</strong> – Minimize background noise</li>
            <li>✅ <strong>Have your questions ready</strong> – Bring any medical documents or notes</li>
            <li>✅ <strong>Join 5 minutes early</strong> – Give yourself time to settle in</li>
          </ul>
        </div>

        <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1e40af;">
            💡 Pro Tips:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
            <li>Position yourself in good lighting (face a window if possible)</li>
            <li>Use headphones for better audio quality</li>
            <li>Have a glass of water nearby</li>
            <li>Silence your phone to avoid distractions</li>
          </ul>
        </div>

        ${generateButtonGroup(buttons)}

        <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
          Need technical help? Contact us at
          <a href="mailto:support@doktu.co" style="color: #0369a1; text-decoration: underline;">support@doktu.co</a>
        </p>

        <p style="margin: 16px 0 0 0; font-size: 14px; color: #64748b;">
          Looking forward to your consultation!
        </p>
      ` +
      generateEmailFooter();

    const plainText = generatePlainTextContent({
      subject: "Consultation Starting in 1 Hour! – Doktu",
      mainContent: `Hi ${data.patient_first_name || 'there'},\n\nYour telemedicine consultation with Dr. ${data.doctor_name} starts in approximately 1 hour.\n\nFINAL CHECKS BEFORE JOINING:\n✅ Test your camera and microphone – Make sure they're working properly\n✅ Check your internet connection – Close unnecessary apps and tabs\n✅ Find a quiet, private space – Minimize background noise\n✅ Have your questions ready – Bring any medical documents or notes\n✅ Join 5 minutes early – Give yourself time to settle in\n\nPRO TIPS:\n• Position yourself in good lighting (face a window if possible)\n• Use headphones for better audio quality\n• Have a glass of water nearby\n• Silence your phone to avoid distractions\n\nNeed technical help? Contact us at support@doktu.co\n\nLooking forward to your consultation!`,
      buttons,
      appointmentData
    });

    return {
      subject: "Consultation Starting in 1 Hour! – Doktu",
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

  account_password_reset: (data) => ({
    subject: "Reset Your Doktu Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #1e293b;">
            Password Reset Request
          </h2>
        </div>

        <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0;">
          Dear ${data.first_name || 'User'},
        </p>

        <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0;">
          We received a request to reset your password for your Doktu account.
        </p>

        <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0;">
          Click the button below to reset your password:
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.reset_link}"
             style="display: inline-block; background-color: #0066cc; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            ⏰ <strong>This link will expire in ${data.expiry_time || '1 hour'}</strong> for security reasons.
          </p>
        </div>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0;">
          If you didn't request this password reset, please ignore this email. Your password will not be changed.
        </p>

        <p style="font-size: 14px; color: #64748b; margin: 16px 0 0 0;">
          For security reasons, never share your password with anyone, including Doktu support staff.
        </p>

        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">
          Best regards,<br>
          <strong>Doktu Security Team</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          If you're having trouble with the button above, copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #0066cc; margin: 8px 0 0 0; word-break: break-all;">
          ${data.reset_link}
        </p>
      </div>
    `
  }),

  account_password_changed: (data) => ({
    subject: "Your Doktu Password Was Changed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 8px 0; font-size: 24px; color: #166534;">
            ✓ Password Successfully Changed
          </h2>
          <p style="margin: 0; font-size: 14px; color: #15803d;">
            ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>

        <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0;">
          Dear ${data.first_name || 'User'},
        </p>

        <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0;">
          This is a confirmation that your Doktu account password was successfully changed.
        </p>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b;">
            Security Details:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #64748b; font-size: 14px;">
            <li>Device: ${data.device || 'Unknown device'}</li>
            <li>Location: ${data.location || 'Unknown location'}</li>
            <li>IP Address: ${data.ip_address || 'Not available'}</li>
            <li>Time: ${data.timestamp || new Date().toLocaleString()}</li>
          </ul>
        </div>

        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #991b1b; font-weight: 600;">
            ⚠️ Didn't change your password?
          </p>
          <p style="margin: 0; font-size: 14px; color: #991b1b;">
            If you did not make this change, your account may be compromised. Please contact our security team immediately.
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.security_url || `${process.env.VITE_APP_URL}/security`}"
             style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Secure My Account
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0;">
          <strong>Security Tips:</strong>
        </p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #64748b; font-size: 14px;">
          <li>Use a strong, unique password for your Doktu account</li>
          <li>Enable two-factor authentication for extra security</li>
          <li>Never share your password with anyone</li>
          <li>Be cautious of phishing emails pretending to be from Doktu</li>
        </ul>

        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">
          Stay secure,<br>
          <strong>Doktu Security Team</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Need help? Contact us at <a href="mailto:security@doktu.co" style="color: #0066cc;">security@doktu.co</a>
        </p>
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

  // ========================================
  // PHASE 1: CRITICAL TEMPLATES (Priority 100-95)
  // ========================================

  // B1 - Payment Pending (15-min Hold) - PRIORITY 100
  booking_payment_pending: (data) => ({
    subject: `Complete payment to secure your booking with Dr. ${data.doctor_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #991b1b;">
            ⏰ Complete your payment - slot expires soon
          </h2>
          <p style="margin: 0; font-size: 16px; color: #991b1b;">
            Your booking with <strong>Dr. ${data.doctor_name}</strong> is on hold for <strong>15 minutes</strong>.
          </p>
        </div>

        <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0;">
          Hi ${data.patient_first_name || 'there'},
        </p>

        <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0;">
          You selected a consultation time with Dr. ${data.doctor_name}, but payment hasn't been completed yet. Your slot is being held, but will be released to other patients if payment isn't completed within 15 minutes.
        </p>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b;">
            Your Booking Details:
          </h3>
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            <strong>Doctor:</strong> Dr. ${data.doctor_name}<br>
            <strong>When:</strong> ${data.appointment_datetime_local || 'N/A'}<br>
            <strong>Duration:</strong> ${data.duration || '30'} minutes<br>
            <strong>Price:</strong> ${data.currency || '€'}${data.price || '45'}
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.payment_link || `${process.env.VITE_APP_URL}/checkout/${data.appointment_id}`}"
             style="display: inline-block; background-color: #ef4444; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 18px;">
            Complete Payment Now
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0;">
          If you don't complete payment within 15 minutes, your slot will be automatically released. Don't worry though - you can always book another time!
        </p>

        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">
          Need help?<br>
          <strong>Doktu Support Team</strong><br>
          <a href="mailto:support@doktu.co" style="color: #0066cc;">support@doktu.co</a>
        </p>
      </div>
    `
  }),

  // B6 - Live/Imminent (≤5 min) - PRIORITY 100
  booking_live_imminent: (data) => ({
    subject: `🚨 LIVE NOW - Join Dr. ${data.doctor_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <h1 style="margin: 0 0 8px 0; font-size: 32px; color: #166534;">
            🚨 JOIN NOW
          </h1>
          <p style="margin: 0; font-size: 20px; color: #15803d; font-weight: 600;">
            Dr. ${data.doctor_name} is ready for you!
          </p>
        </div>

        <p style="font-size: 18px; color: #475569; margin: 0 0 24px 0; text-align: center;">
          Hi ${data.patient_first_name || 'there'}, your consultation ${data.time_to_start === 'live' ? 'is live now' : `starts in ${data.time_to_start || '5 minutes'}`}!
        </p>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b; text-align: center;">
            Your Consultation:
          </h3>
          <p style="margin: 0; color: #64748b; font-size: 16px; text-align: center;">
            <strong>Dr. ${data.doctor_name}</strong><br>
            ${data.doctor_specialization || 'General Practice'}<br>
            ${data.appointment_datetime_local || 'Now'}
          </p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="${data.join_link}"
             style="display: inline-block; background-color: #16a34a; color: white; padding: 20px 60px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 22px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            🎥 JOIN VIDEO CALL
          </a>
        </div>

        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
            Quick Tech Check:
          </h3>
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            ✓ Camera working?<br>
            ✓ Microphone clear?<br>
            ✓ Quiet space ready?
          </p>
        </div>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0; text-align: center;">
          Having technical issues? Contact support immediately:<br>
          <a href="mailto:support@doktu.co" style="color: #0066cc; font-weight: 600;">support@doktu.co</a>
        </p>
      </div>
    `
  }),

  // M4 - Membership Payment Failed (1st Attempt) - PRIORITY 100
  membership_payment_failed: (data) => ({
    subject: "Payment issue - update to keep your membership active",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #92400e;">
            ⚠️ Payment couldn't be processed
          </h2>
          <p style="margin: 0; font-size: 16px; color: #92400e;">
            Quick fix needed to avoid service interruption
          </p>
        </div>

        <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0;">
          Hi ${data.first_name || 'there'},
        </p>

        <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0;">
          We couldn't process your membership renewal payment. This is usually a quick fix!
        </p>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b;">
            Payment Details:
          </h3>
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            <strong>Failed amount:</strong> ${data.currency || '€'}${data.amount || '29.99'}<br>
            <strong>Attempt date:</strong> ${data.attempt_date || new Date().toLocaleDateString()}<br>
            <strong>Payment method:</strong> ${data.payment_method || 'Card ending in ****'}<br>
            <strong>Reason:</strong> ${data.failure_reason || 'Payment declined by bank'}
          </p>
        </div>

        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
            Most Common Fixes:
          </h3>
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            ✓ <strong>Expired card</strong> → Update expiry date<br>
            ✓ <strong>Insufficient funds</strong> → Try different card<br>
            ✓ <strong>Bank decline</strong> → Contact your bank<br>
            ✓ <strong>Card details changed</strong> → Update information
          </p>
        </div>

        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">
            ⏰ What happens next:
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #991b1b;">
            • <strong>Update payment now</strong> → Keeps membership active<br>
            • <strong>Don't update</strong> → Membership suspends in 48 hours
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.update_payment_url || `${process.env.VITE_APP_URL}/membership/payment`}"
             style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Update Payment Method
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0;">
          Need help? Our support team is here for you:<br>
          <a href="mailto:support@doktu.co" style="color: #0066cc;">support@doktu.co</a>
        </p>

        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">
          Best regards,<br>
          <strong>Doktu Membership Team</strong>
        </p>
      </div>
    `
  }),

  // M5 - Membership Suspended (2nd Failure) - PRIORITY 100
  membership_suspended: (data) => ({
    subject: "Membership suspended - restore access anytime",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #991b1b;">
            🔒 Membership Temporarily Suspended
          </h2>
          <p style="margin: 0; font-size: 16px; color: #991b1b;">
            Update payment to reactivate immediately
          </p>
        </div>

        <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0;">
          Hi ${data.first_name || 'there'},
        </p>

        <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0;">
          Your Doktu membership has been suspended because payment couldn't be processed after multiple attempts.
        </p>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b;">
            Suspension Details:
          </h3>
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            <strong>Suspended on:</strong> ${data.suspension_date || new Date().toLocaleDateString()}<br>
            <strong>Reason:</strong> ${data.failure_reason || 'Payment failure after multiple attempts'}<br>
            <strong>Outstanding amount:</strong> ${data.currency || '€'}${data.amount || '29.99'}<br>
            <strong>Coverage status:</strong> Paused until payment updated
          </p>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">
            What This Means:
          </h3>
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            ❌ Can't book member consultations<br>
            ❌ Lost access to priority booking slots<br>
            ❌ Member benefits paused<br>
            ✅ Your consultation history remains safe<br>
            ✅ Your health profile is secure
          </p>
        </div>

        <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #15803d;">
            To Reactivate:
          </h3>
          <p style="margin: 0; font-size: 14px; color: #15803d;">
            1. Update your payment method<br>
            2. Membership reactivates <strong>instantly</strong><br>
            3. Continue using all your benefits
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.reactivate_url || `${process.env.VITE_APP_URL}/membership/reactivate`}"
             style="display: inline-block; background-color: #dc2626; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 18px;">
            Reactivate My Membership
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0;">
          Having trouble updating your payment? We're here to help:<br>
          <a href="mailto:support@doktu.co" style="color: #0066cc; font-weight: 600;">support@doktu.co</a>
        </p>

        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">
          We're ready to welcome you back,<br>
          <strong>Doktu Membership Team</strong>
        </p>
      </div>
    `
  }),

  // M1 - Membership Activated - PRIORITY 95
  membership_activated: (data) => ({
    subject: "🎉 Your Doktu membership is live!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef3c7; border-radius: 8px; padding: 32px; margin-bottom: 24px; text-align: center;">
          <h1 style="margin: 0 0 16px 0; font-size: 32px; color: #92400e;">
            🎉 Welcome to Unlimited Healthcare!
          </h1>
          <p style="margin: 0; font-size: 18px; color: #92400e; font-weight: 600;">
            Your ${data.plan_name || 'Doktu'} membership is now active
          </p>
        </div>

        <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0;">
          Hi ${data.first_name || 'there'},
        </p>

        <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0;">
          Congratulations! Your membership is active and ready to use. Here's what you get every month:
        </p>

        <div style="background-color: #dcfce7; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #166534;">
            ✓ Your Member Benefits:
          </h3>
          <p style="margin: 0; color: #15803d; font-size: 16px; line-height: 1.8;">
            <strong>✓ ${data.allowance || '2'} × ${data.consultation_duration || '30'}-minute consultations</strong> every month<br>
            ✓ Priority booking slots (book sooner than non-members)<br>
            ✓ No booking fees<br>
            ✓ Access to member-only doctors<br>
            ✓ 24/7 access to your consultation history<br>
            ✓ Secure health records storage
          </p>
        </div>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b;">
            Membership Details:
          </h3>
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            <strong>Plan:</strong> ${data.plan_name || 'Monthly Membership'}<br>
            <strong>Monthly price:</strong> ${data.currency || '€'}${data.amount || '29.99'}<br>
            <strong>Activated:</strong> ${data.activation_date || new Date().toLocaleDateString()}<br>
            <strong>Your cycle resets:</strong> ${data.reset_date || 'on the same day each month'}<br>
            <strong>Next charge:</strong> ${data.next_charge_date || 'Next month'} for ${data.currency || '€'}${data.amount || '29.99'}
          </p>
        </div>

        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
            💡 Pro Member Tip:
          </h3>
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            <strong>Book early in your cycle</strong> to get your preferred doctors and times! Your ${data.allowance || '2'} consultations reset ${data.reset_date || 'monthly'}.
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.dashboard_url || `${process.env.VITE_APP_URL}/dashboard`}"
             style="display: inline-block; background-color: #f59e0b; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 18px;">
            Book My First Member Consultation
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0;">
          Manage your membership anytime:<br>
          <a href="${data.manage_url || `${process.env.VITE_APP_URL}/membership`}" style="color: #0066cc;">Membership Settings</a>
        </p>

        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">
          Welcome to the family!<br>
          <strong>Doktu Team</strong>
        </p>
      </div>
    `
  }),

  // M3 - Membership Renewed (Success) - PRIORITY 95
  membership_renewed: (data) => ({
    subject: "✓ Membership renewed - 2 fresh visits ready!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dcfce7; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <h2 style="margin: 0 0 8px 0; font-size: 28px; color: #166534;">
            ✓ Fresh Month, Fresh Consultations!
          </h2>
          <p style="margin: 0; font-size: 16px; color: #15803d;">
            Your membership renewed successfully
          </p>
        </div>

        <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0;">
          Hi ${data.first_name || 'there'},
        </p>

        <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0;">
          Great news! Your Doktu membership has renewed successfully and your consultation allowance has been reset.
        </p>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b;">
            Renewal Details:
          </h3>
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            <strong>Renewed:</strong> ${data.renew_date || new Date().toLocaleDateString()}<br>
            <strong>Amount charged:</strong> ${data.currency || '€'}${data.amount || '29.99'}<br>
            <strong>Payment method:</strong> ${data.payment_method || 'Card ending in ****'}<br>
            <strong>New cycle:</strong> ${data.cycle_start || 'Today'} - ${data.cycle_end || 'Next month'}<br>
            <strong>Transaction ID:</strong> ${data.transaction_id || 'N/A'}
          </p>
        </div>

        <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
          <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #166534;">
            Fresh Allowance Available:
          </h3>
          <p style="margin: 0; font-size: 24px; color: #15803d; font-weight: 700;">
            ${data.allowance || '2'} × ${data.consultation_duration || '30'}-minute consultations
          </p>
          <p style="margin: 12px 0 0 0; font-size: 14px; color: #15803d;">
            Ready to book anytime!
          </p>
        </div>

        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
            📄 Your Receipt:
          </h3>
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            Your invoice for ${data.currency || '€'}${data.amount || '29.99'} is attached to this email. You can also download it anytime from your membership portal.
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.booking_url || `${process.env.VITE_APP_URL}/doctors`}"
             style="display: inline-block; background-color: #16a34a; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 18px; margin-right: 10px;">
            Book My First Consultation
          </a>
          <a href="${data.invoice_url || `${process.env.VITE_APP_URL}/membership/invoices`}"
             style="display: inline-block; background-color: #64748b; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 18px;">
            View Invoice
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0;">
          Questions about your membership?<br>
          <a href="${data.manage_url || `${process.env.VITE_APP_URL}/membership`}" style="color: #0066cc;">Manage Membership</a> |
          <a href="mailto:support@doktu.co" style="color: #0066cc;">Contact Support</a>
        </p>

        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">
          Thank you for being a valued member!<br>
          <strong>Doktu Team</strong>
        </p>
      </div>
    `
  }),

  // M7 - Membership Reactivated - PRIORITY 95
  membership_reactivated: (data) => ({
    subject: "Welcome back! Your membership is active again",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dcfce7; border-radius: 8px; padding: 32px; margin-bottom: 24px; text-align: center;">
          <h1 style="margin: 0 0 16px 0; font-size: 32px; color: #166534;">
            🎉 You're Back!
          </h1>
          <p style="margin: 0; font-size: 18px; color: #15803d; font-weight: 600;">
            Membership reactivated - all benefits restored
          </p>
        </div>

        <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0;">
          Hi ${data.first_name || 'there'},
        </p>

        <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0;">
          Great to have you back! Your Doktu membership has been successfully reactivated and all your member benefits are now available again.
        </p>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b;">
            Reactivation Details:
          </h3>
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            <strong>Reactivated:</strong> ${data.reactivation_date || new Date().toLocaleDateString()}<br>
            <strong>Current cycle:</strong> ${data.cycle_start || 'Now'} - ${data.cycle_end || 'End of month'}<br>
            <strong>Available visits:</strong> ${data.available_visits || '2'} consultations this cycle<br>
            <strong>Next renewal:</strong> ${data.next_renewal || 'Next month'}<br>
            <strong>Monthly price:</strong> ${data.currency || '€'}${data.amount || '29.99'}
          </p>
        </div>

        <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #166534; text-align: center;">
            ✓ All Benefits Restored:
          </h3>
          <p style="margin: 0; color: #15803d; font-size: 16px; line-height: 1.8;">
            ✓ Priority booking slots<br>
            ✓ Member-only doctors<br>
            ✓ No booking fees<br>
            ✓ 24/7 record access<br>
            ✓ ${data.available_visits || '2'} consultations per month
          </p>
        </div>

        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
            💡 Welcome Back Tip:
          </h3>
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            You have <strong>${data.available_visits || '2'} consultations available</strong> in your current cycle until ${data.cycle_end || 'next month'}. Book now to get your preferred times!
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.booking_url || `${process.env.VITE_APP_URL}/doctors`}"
             style="display: inline-block; background-color: #16a34a; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 18px;">
            Book My Consultation
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0; text-align: center;">
          Thanks for choosing Doktu again!<br>
          <a href="${data.manage_url || `${process.env.VITE_APP_URL}/membership`}" style="color: #0066cc;">Manage Membership</a>
        </p>

        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">
          Welcome back to the family!<br>
          <strong>Doktu Team</strong>
        </p>
      </div>
    `
  }),

  // P1 - Pay-Per-Visit Receipt - PRIORITY 95
  payment_receipt: (data) => ({
    subject: `Receipt: ${data.currency || '€'}${data.amount || '45'} - Dr. ${data.doctor_name} consultation`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 8px 0; font-size: 24px; color: #166534;">
            ✓ Payment Confirmation
          </h2>
          <p style="margin: 0; font-size: 16px; color: #15803d;">
            Payment successful - receipt attached
          </p>
        </div>

        <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0;">
          Hi ${data.first_name || data.patient_first_name || 'there'},
        </p>

        <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0;">
          Thank you for your payment. Your consultation with Dr. ${data.doctor_name} has been confirmed and paid for.
        </p>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin: 24px 0; border: 2px solid #e2e8f0;">
          <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
            Receipt Details
          </h3>

          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Consultation</p>
            <p style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 600;">
              Dr. ${data.doctor_first_name || ''} ${data.doctor_name}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">
              ${data.doctor_specialization || 'General Practice'}
            </p>
          </div>

          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Date & Time</p>
            <p style="margin: 0; font-size: 14px; color: #1e293b;">
              ${data.consultation_date || data.appointment_datetime_local || 'N/A'}
            </p>
          </div>

          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Payment Method</p>
            <p style="margin: 0; font-size: 14px; color: #1e293b;">
              ${data.payment_method || 'Card ending in ****'}
            </p>
          </div>

          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Transaction ID</p>
            <p style="margin: 0; font-size: 14px; color: #1e293b; font-family: monospace;">
              ${data.transaction_id || 'N/A'}
            </p>
          </div>

          <div style="border-top: 2px solid #e2e8f0; padding-top: 16px; margin-top: 20px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Total Amount</p>
            <p style="margin: 0; font-size: 28px; color: #166534; font-weight: 700;">
              ${data.currency || '€'}${data.amount || '45.00'}
            </p>
          </div>
        </div>

        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
            📄 Invoice Attached
          </h3>
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            A detailed invoice is attached to this email for your records. You can also download it anytime from your dashboard.
          </p>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">
            ⭐ Rate Your Experience
          </h3>
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            After your consultation, please take a moment to rate Dr. ${data.doctor_name}. Your feedback helps other patients make informed choices.
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.consultation_url || `${process.env.VITE_APP_URL}/consultations/${data.appointment_id || data.consultation_id}`}"
             style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 10px;">
            View Consultation Details
          </a>
          <a href="${data.invoice_url || `${process.env.VITE_APP_URL}/invoices/${data.transaction_id}`}"
             style="display: inline-block; background-color: #64748b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Download Invoice
          </a>
        </div>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0;">
          Questions about this payment?<br>
          <a href="mailto:billing@doktu.co" style="color: #0066cc;">billing@doktu.co</a> |
          <a href="${process.env.VITE_APP_URL}/billing" style="color: #0066cc;">View Billing History</a>
        </p>

        <p style="font-size: 16px; color: #475569; margin: 32px 0 0 0;">
          Thank you for choosing Doktu,<br>
          <strong>Doktu Billing Team</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
          This is an official receipt for your records. Please keep for tax and reimbursement purposes.
        </p>
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
    booking_reminder_1h: ["patient_first_name", "appointment_datetime_local", "doctor_name", "join_link"],
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
    account_password_reset: ["first_name", "reset_link"],
    account_password_changed: ["first_name"],
    health_profile_incomplete: ["first_name"],
    // Phase 1: Critical Templates (Priority 100-95)
    booking_payment_pending: ["patient_first_name", "doctor_name", "appointment_datetime_local", "price", "appointment_id"],
    booking_live_imminent: ["patient_first_name", "doctor_name", "join_link"],
    membership_payment_failed: ["first_name", "amount"],
    membership_suspended: ["first_name", "amount"],
    membership_activated: ["first_name"],
    membership_renewed: ["first_name", "amount"],
    membership_reactivated: ["first_name"],
    payment_receipt: ["doctor_name", "amount"]
  };

  return fieldMap[templateKey] || [];
}