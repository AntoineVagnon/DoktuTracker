import { db } from "./server/db";
import { users, doctors, appointments } from "./shared/schema";
import { eq } from "drizzle-orm";
import { emailService } from "./server/emailService";

async function sendConfirmationEmailDirectly() {
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
    
    // Create the email HTML content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de votre rendez-vous</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
    <h1 style="color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">Confirmation de rendez-vous</h1>
    
    <p>Bonjour ${patientName},</p>
    
    <p>Votre rendez-vous de téléconsultation est confirmé !</p>
    
    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h2 style="color: #0066cc; margin-top: 0;">Détails du rendez-vous</h2>
      <p><strong>Date :</strong> ${appointmentDate.toLocaleDateString('fr-FR')}</p>
      <p><strong>Heure :</strong> ${appointmentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
      <p><strong>Médecin :</strong> ${doctorName}</p>
      <p><strong>Type :</strong> Téléconsultation</p>
      <p><strong>Montant :</strong> ${appointment.price || '35.00'} €</p>
      <p><strong>Numéro de confirmation :</strong> #${appointment.id}</p>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="color: #856404; margin-top: 0;">Informations importantes</h3>
      <ul style="color: #856404;">
        <li>Connectez-vous 5 minutes avant l'heure du rendez-vous</li>
        <li>Assurez-vous d'avoir une connexion internet stable</li>
        <li>Testez votre caméra et votre microphone à l'avance</li>
        <li>Le lien de connexion vous sera envoyé par email 30 minutes avant le rendez-vous</li>
      </ul>
    </div>
    
    <p>Si vous devez annuler ou reporter ce rendez-vous, veuillez nous contacter au moins 24 heures à l'avance.</p>
    
    <p>Cordialement,<br>
    L'équipe Doktu</p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
    
    <p style="font-size: 12px; color: #666; text-align: center;">
      © ${new Date().getFullYear()} Doktu - Plateforme de télémédecine<br>
      Cet email a été envoyé à ${patient.email}
    </p>
  </div>
</body>
</html>`;
    
    // Send the email
    const success = await emailService.sendEmail({
      to: patient.email,
      subject: `Confirmation de votre rendez-vous du ${appointmentDate.toLocaleDateString('fr-FR')}`,
      html: emailHtml
    });
    
    if (success) {
      console.log("✅ Email de confirmation envoyé avec succès à " + patient.email);
      console.log("📧 Veuillez vérifier votre boîte de réception");
    } else {
      console.log("❌ Échec de l'envoi de l'email");
    }
    
  } catch (error) {
    console.error("Erreur:", error);
  }
  process.exit(0);
}

sendConfirmationEmailDirectly();
