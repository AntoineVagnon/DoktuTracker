// Calendar service for generating .ics files
import { db } from "../db";
import { appointments, users, doctors } from "@shared/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";

export async function createICSAttachment(
  appointmentId: number, 
  method: "ADD" | "CANCEL" | "REQUEST" = "ADD"
): Promise<string> {
  // Get appointment details
  const [appointment] = await db
    .select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      zoomLink: appointments.zoomLink,
      status: appointments.status
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // Get patient details
  const [patient] = await db
    .select({
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName
    })
    .from(users)
    .where(eq(users.id, appointment.patientId));

  // Get doctor details
  const [doctor] = await db
    .select({
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      },
      specialty: doctors.specialty
    })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(eq(doctors.id, appointment.doctorId));

  const startDate = new Date(appointment.appointmentDate);
  const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 minutes consultation

  // Format dates for iCal
  const formatICalDate = (date: Date) => {
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };

  const uid = `appointment-${appointment.id}@doktu.com`;
  const now = new Date();

  // Build the .ics content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DokTu//Medical Consultation//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:Medical Consultation with Dr. ${doctor.user.lastName}`,
    `DESCRIPTION:Online medical consultation via DokTu platform.\\n\\nJoin link: ${appointment.zoomLink || 'Will be provided'}\\n\\nPlease join 2-5 minutes before the scheduled time.`,
    `LOCATION:${appointment.zoomLink || 'Online'}`,
    `ORGANIZER;CN=DokTu:mailto:appointments@doktu.com`,
    `ATTENDEE;CN="${patient.firstName} ${patient.lastName}";RSVP=TRUE:mailto:${patient.email}`,
    `ATTENDEE;CN="Dr. ${doctor.user.firstName} ${doctor.user.lastName}";RSVP=TRUE:mailto:${doctor.user.email}`,
    'SEQUENCE:0',
    `STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your consultation starts in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}