// ICS calendar file generator for appointment emails
import { format } from 'date-fns';

export interface ICSEventData {
  uid: string;
  summary: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  attendeeName: string;
  url?: string;
  sequence?: number;
  method?: 'REQUEST' | 'CANCEL' | 'REPLY';
}

// Format date for ICS (YYYYMMDDTHHMMSSZ in UTC)
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Generate ICS calendar content
export function generateICS(eventData: ICSEventData): string {
  const method = eventData.method || 'REQUEST';
  const sequence = eventData.sequence || 0;
  const now = new Date();
  
  // Escape special characters for ICS format
  const escapeICS = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Doktu Medical Platform//EN',
    `METHOD:${method}`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${eventData.uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(eventData.startTime)}`,
    `DTEND:${formatICSDate(eventData.endTime)}`,
    `SUMMARY:${escapeICS(eventData.summary)}`,
    `DESCRIPTION:${escapeICS(eventData.description)}`,
    `LOCATION:${escapeICS(eventData.location)}`,
    `ORGANIZER;CN="${escapeICS(eventData.organizerName)}":mailto:${eventData.organizerEmail}`,
    `ATTENDEE;CN="${escapeICS(eventData.attendeeName)}";RSVP=TRUE:mailto:${eventData.attendeeEmail}`,
    `SEQUENCE:${sequence}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'CLASS:PUBLIC'
  ];

  if (eventData.url) {
    icsContent.push(`URL:${eventData.url}`);
  }

  // Add alarm for 15 minutes before
  if (method !== 'CANCEL') {
    icsContent.push(
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'DESCRIPTION:Appointment reminder',
      'ACTION:DISPLAY',
      'END:VALARM'
    );
  }

  icsContent.push(
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return icsContent.join('\r\n');
}

// Generate ICS for appointment confirmation
export function generateAppointmentICS(data: {
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorEmail: string;
  doctorSpecialization: string;
  startTime: Date;
  endTime?: Date;
  joinLink?: string;
  sequence?: number;
  method?: 'REQUEST' | 'CANCEL' | 'REPLY';
}): string {
  const endTime = data.endTime || new Date(data.startTime.getTime() + 30 * 60 * 1000); // Default 30 minutes
  
  const eventData: ICSEventData = {
    uid: `doktu-appointment-${data.appointmentId}@doktu.co`,
    summary: `Telemedicine Consultation - Dr. ${data.doctorName}`,
    description: [
      `Telemedicine consultation with Dr. ${data.doctorName} (${data.doctorSpecialization})`,
      '',
      'Please join the video call 2-5 minutes before the scheduled time.',
      'Ensure you have a stable internet connection and test your camera/microphone.',
      '',
      data.joinLink ? `Join Video Call: ${data.joinLink}` : '',
      '',
      'For support, contact: support@doktu.co',
      '',
      'Powered by Doktu Medical Platform'
    ].filter(Boolean).join('\\n'),
    location: data.joinLink ? `Video Consultation: ${data.joinLink}` : 'Video Consultation - Doktu Platform',
    startTime: data.startTime,
    endTime: endTime,
    organizerEmail: data.doctorEmail,
    organizerName: `Dr. ${data.doctorName}`,
    attendeeEmail: data.patientEmail,
    attendeeName: data.patientName,
    url: data.joinLink,
    sequence: data.sequence || 0,
    method: data.method || 'REQUEST'
  };

  return generateICS(eventData);
}

// Generate base64 encoded ICS for email attachment
export function generateICSAttachment(icsContent: string, filename: string = 'appointment.ics'): {
  filename: string;
  content: string;
  contentType: string;
} {
  return {
    filename: filename,
    content: Buffer.from(icsContent, 'utf8').toString('base64'),
    contentType: 'text/calendar; charset=utf-8; method=REQUEST'
  };
}

// Generate ICS for cancellation
export function generateCancellationICS(data: {
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorEmail: string;
  startTime: Date;
  endTime?: Date;
  sequence: number;
}): string {
  return generateAppointmentICS({
    ...data,
    doctorSpecialization: '',
    method: 'CANCEL',
    sequence: data.sequence + 1
  });
}

// Generate ICS for reschedule (updated appointment)
export function generateRescheduleICS(data: {
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorEmail: string;
  doctorSpecialization: string;
  startTime: Date;
  endTime?: Date;
  joinLink?: string;
  sequence: number;
}): string {
  return generateAppointmentICS({
    ...data,
    method: 'REQUEST',
    sequence: data.sequence + 1
  });
}