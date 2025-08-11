import { db } from "./server/db";
import { users, doctors, appointments } from "./shared/schema";
import { eq } from "drizzle-orm";
import { emailService } from "./server/emailService";
import { emailTemplates } from "./server/services/emailTemplates";
import { CalendarService } from "./server/services/calendarService";

async function sendConfirmationEmail() {
  try {
    // Get appointment details
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, 31));
    
    // Get patient details
    const [patient] = await db
      .select()
      .from(users)
      .where(eq(users.id, 53));
    
    // Get doctor details
    const [doctor] = await db
      .select({
        user: users,
        doctor: doctors
      })
      .from(doctors)
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.id, 9));
    
    if (!appointment || !patient || !doctor) {
      console.log("❌ Missing data");
      return;
    }
    
    const appointmentDate = new Date(appointment.appointmentDate);
    const doctorName = `Dr. ${doctor.user?.firstName} ${doctor.user?.lastName}`;
    const patientName = `${patient.firstName} ${patient.lastName}`;
    
    console.log(`📋 Sending confirmation to: ${patient.email}`);
    console.log(`   Patient: ${patientName}`);
    console.log(`   Doctor: ${doctorName}`);
    console.log(`   Date: ${appointmentDate.toLocaleString('fr-FR')}`);
    
    // Generate the email content using the template
    const template = emailTemplates.booking_confirmation;
    const emailContent = template.html
      .replace(/{{patientName}}/g, patientName)
      .replace(/{{doctorName}}/g, doctorName)
      .replace(/{{appointmentDate}}/g, appointmentDate.toLocaleDateString('fr-FR'))
      .replace(/{{appointmentTime}}/g, appointmentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
      .replace(/{{appointmentId}}/g, appointment.id.toString())
      .replace(/{{price}}/g, appointment.price || '35.00')
      .replace(/{{year}}/g, new Date().getFullYear().toString());
    
    // Generate ICS file
    const calendarService = new CalendarService();
    const icsContent = calendarService.generateICS({
      title: `Consultation avec ${doctorName}`,
      description: `Consultation de télémédecine avec ${doctorName} via Doktu`,
      startTime: appointmentDate,
      endTime: new Date(appointmentDate.getTime() + 30 * 60 * 1000), // 30 minutes
      location: 'Téléconsultation Doktu',
      organizer: { name: 'Doktu', email: 'no-reply@doktu.com' },
      attendees: [
        { name: patientName, email: patient.email },
        { name: doctorName, email: doctor.user?.email || 'doctor@doktu.com' }
      ]
    });
    
    // Send the email
    const success = await emailService.sendEmail({
      to: patient.email,
      subject: template.subject.replace('{{appointmentDate}}', appointmentDate.toLocaleDateString('fr-FR')),
      html: emailContent,
      attachments: [{
        content: Buffer.from(icsContent).toString('base64'),
        filename: 'appointment.ics',
        type: 'text/calendar',
        disposition: 'attachment'
      }]
    });
    
    if (success) {
      console.log("✅ Confirmation email sent successfully to " + patient.email);
    } else {
      console.log("❌ Failed to send email");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

sendConfirmationEmail();
