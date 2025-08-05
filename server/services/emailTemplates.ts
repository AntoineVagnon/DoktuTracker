// Email template definitions based on the provided specifications
import { format } from "date-fns";

export interface EmailTemplate {
  subject: string;
  html: string;
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

  booking_confirmation: (data) => ({
    subject: "Your Consultation is Confirmed – DokTu",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.patient_first_name || 'Patient'},</p>
        
        <p>Your consultation has been successfully booked.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;">📅 <strong>Date & Time:</strong> ${data.appointment_datetime_local}</p>
          <p style="margin: 5px 0;">👨‍⚕️ <strong>Doctor:</strong> ${data.doctor_name} (${data.doctor_specialization})</p>
          <p style="margin: 5px 0;">🔗 <strong>Join Link:</strong> <a href="${data.join_link}">Secure Consultation Link</a></p>
        </div>
        
        <p>Please log in 2–5 minutes before the scheduled time and ensure your audio/video is working properly.</p>
        
        <p>To ensure the consultation is successful, please read our <a href="${process.env.VITE_APP_URL}/consultation-guidelines">Consultation Guidelines</a></p>
        
        <p>If you need to reschedule or cancel, please log in to your profile at <a href="${process.env.VITE_APP_URL}/patient/appointments/${data.appointment_id}">${process.env.VITE_APP_URL}/patient/appointments</a> and use the buttons below. If you need any support, please contact us at support@doktu.co.</p>
        
        <p>Thank you for choosing DokTu.</p>
        
        <p>DokTu Support Team</p>
      </div>
    `
  }),

  booking_reminder_24h: (data) => ({
    subject: "Reminder – Your DokTu Consultation is Coming Up",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hi ${data.patient_first_name || 'there'},</p>
        
        <p>This is a friendly reminder that your consultation is scheduled for:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;">📅 ${data.appointment_datetime_local}</p>
          <p style="margin: 5px 0;">👨‍⚕️ Dr. ${data.doctor_name}</p>
          <p style="margin: 5px 0;">🔗 Join here: <a href="${data.join_link}">Secure Link</a></p>
        </div>
        
        <p>Please ensure you're in a quiet space with a stable internet connection.</p>
        <p>If you need to make changes, use the patient dashboard or contact us.</p>
        
        <p>Thank you,<br>DokTu Support</p>
      </div>
    `
  }),

  cancellation_confirmation: (data) => ({
    subject: "Your Consultation Has Been Cancelled",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${data.patient_first_name || 'Patient'},</p>
        
        <p>We confirm that your consultation with Dr. ${data.doctor_name} scheduled for ${data.appointment_datetime_local} has been cancelled.</p>
        
        <p>If this was a mistake, you may reschedule directly from your dashboard.</p>
        
        <p>Refunds or credits (if applicable) will be processed in accordance with our cancellation policy.</p>
        
        <p>We're here if you need further assistance.</p>
        
        <p>DokTu Team</p>
      </div>
    `
  }),

  reschedule_confirmation: (data) => ({
    subject: "Your Consultation Has Been Rescheduled",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hi ${data.patient_first_name || 'there'},</p>
        
        <p>Your consultation has been successfully rescheduled.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;">📅 <strong>New Date & Time:</strong> ${data.new_appointment_datetime_local}</p>
          <p style="margin: 5px 0;">👨‍⚕️ <strong>Doctor:</strong> Dr. ${data.doctor_name}</p>
          <p style="margin: 5px 0;">🔗 <strong>Updated Join Link:</strong> <a href="${data.join_link}">Link</a></p>
        </div>
        
        <p>If you have any supporting documents or updates to share with the doctor, you may upload them to your profile.</p>
        
        <p>We look forward to seeing you online.</p>
        
        <p>DokTu Support Team</p>
      </div>
    `
  }),

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
    doctor_upcoming_1h: ["patient_name"]
  };
  
  return fieldMap[templateKey] || [];
}