// Appointment-specific email service with ICS attachments and timezone handling
import { sendEmail, sendAppointmentEmail } from './emailService';
import { generateAppointmentICS, generateCancellationICS, generateRescheduleICS } from './icsGenerator';
import { getTemplate } from './emailTemplates';

export interface AppointmentEmailData {
  appointment_id: string;
  patient_first_name: string;
  patient_email: string;
  patient_timezone?: string;
  doctor_name: string;
  doctor_email: string;
  doctor_specialization: string;
  appointment_datetime_utc: string;
  join_link?: string;
  price?: string;
  currency?: string;
  sequence?: number;
}

// Send appointment confirmation with ICS attachment
export async function sendAppointmentConfirmation(data: AppointmentEmailData): Promise<void> {
  try {
    console.log('📧 Sending appointment confirmation email...');
    
    const template = getTemplate('booking_confirmation', data);
    const startTime = new Date(data.appointment_datetime_utc);
    
    // Generate ICS calendar attachment
    const icsContent = generateAppointmentICS({
      appointmentId: data.appointment_id,
      patientName: data.patient_first_name,
      patientEmail: data.patient_email,
      doctorName: data.doctor_name,
      doctorEmail: data.doctor_email,
      doctorSpecialization: data.doctor_specialization,
      startTime: startTime,
      joinLink: data.join_link,
      sequence: data.sequence || 0
    });

    await sendAppointmentEmail({
      to: data.patient_email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      icsContent: icsContent,
      icsFilename: `appointment-${data.appointment_id}.ics`
    });

    console.log(`✅ Appointment confirmation sent to ${data.patient_email}`);
  } catch (error) {
    console.error('❌ Error sending appointment confirmation:', error);
    throw error;
  }
}

// Send appointment reminder
export async function sendAppointmentReminder(data: AppointmentEmailData): Promise<void> {
  try {
    console.log('📧 Sending appointment reminder email...');
    
    const template = getTemplate('booking_reminder_24h', data);
    const startTime = new Date(data.appointment_datetime_utc);
    
    // Generate ICS calendar attachment (same event, just a reminder)
    const icsContent = generateAppointmentICS({
      appointmentId: data.appointment_id,
      patientName: data.patient_first_name,
      patientEmail: data.patient_email,
      doctorName: data.doctor_name,
      doctorEmail: data.doctor_email,
      doctorSpecialization: data.doctor_specialization,
      startTime: startTime,
      joinLink: data.join_link,
      sequence: data.sequence || 0
    });

    await sendAppointmentEmail({
      to: data.patient_email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      icsContent: icsContent,
      icsFilename: `reminder-${data.appointment_id}.ics`
    });

    console.log(`✅ Appointment reminder sent to ${data.patient_email}`);
  } catch (error) {
    console.error('❌ Error sending appointment reminder:', error);
    throw error;
  }
}

// Send cancellation email with ICS cancellation
export async function sendAppointmentCancellation(data: AppointmentEmailData & {
  cancellation_reason?: string;
}): Promise<void> {
  try {
    console.log('📧 Sending appointment cancellation email...');
    
    const template = getTemplate('cancellation_confirmation', {
      ...data,
      cancellation_reason: data.cancellation_reason || 'No reason provided'
    });
    
    const startTime = new Date(data.appointment_datetime_utc);
    
    // Generate ICS cancellation
    const icsContent = generateCancellationICS({
      appointmentId: data.appointment_id,
      patientName: data.patient_first_name,
      patientEmail: data.patient_email,
      doctorName: data.doctor_name,
      doctorEmail: data.doctor_email,
      startTime: startTime,
      sequence: (data.sequence || 0) + 1
    });

    await sendAppointmentEmail({
      to: data.patient_email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      icsContent: icsContent,
      icsFilename: `cancellation-${data.appointment_id}.ics`
    });

    console.log(`✅ Appointment cancellation sent to ${data.patient_email}`);
  } catch (error) {
    console.error('❌ Error sending appointment cancellation:', error);
    throw error;
  }
}

// Send reschedule confirmation with updated ICS
export async function sendAppointmentReschedule(data: AppointmentEmailData & {
  old_datetime_utc: string;
}): Promise<void> {
  try {
    console.log('📧 Sending appointment reschedule email...');
    
    const template = getTemplate('reschedule_confirmation', {
      ...data,
      old_appointment_datetime_utc: data.old_datetime_utc
    });
    
    const newStartTime = new Date(data.appointment_datetime_utc);
    
    // Generate updated ICS with incremented sequence
    const icsContent = generateRescheduleICS({
      appointmentId: data.appointment_id,
      patientName: data.patient_first_name,
      patientEmail: data.patient_email,
      doctorName: data.doctor_name,
      doctorEmail: data.doctor_email,
      doctorSpecialization: data.doctor_specialization,
      startTime: newStartTime,
      joinLink: data.join_link,
      sequence: (data.sequence || 0) + 1
    });

    await sendAppointmentEmail({
      to: data.patient_email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      icsContent: icsContent,
      icsFilename: `reschedule-${data.appointment_id}.ics`
    });

    console.log(`✅ Appointment reschedule confirmation sent to ${data.patient_email}`);
  } catch (error) {
    console.error('❌ Error sending appointment reschedule:', error);
    throw error;
  }
}

// Send doctor notification emails
export async function sendDoctorNotification(type: 'appointment_booked' | 'appointment_cancelled', data: AppointmentEmailData): Promise<void> {
  try {
    console.log(`📧 Sending doctor notification: ${type}...`);
    
    const template = getTemplate(`doctor_${type}`, data);
    
    await sendEmail({
      to: data.doctor_email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    console.log(`✅ Doctor notification (${type}) sent to ${data.doctor_email}`);
  } catch (error) {
    console.error(`❌ Error sending doctor notification (${type}):`, error);
    throw error;
  }
}