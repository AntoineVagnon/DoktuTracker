// Patch script to add appointment data enrichment to notificationService.ts
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'services', 'notificationService.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find the location to insert enrichment code
const searchString = `      const finalMergeData = {
        ...minimalMergeData,
        ...notificationMergeData
      };

      console.log('📧 Final merge data keys:', Object.keys(finalMergeData));
      console.log('🌍 Using locale for email template:', userLocale);`;

const replacementString = `      let finalMergeData = {
        ...minimalMergeData,
        ...notificationMergeData
      };

      // Enrich with appointment data if appointmentId is present
      if (notification.appointmentId) {
        console.log('📅 Enriching merge data with appointment details for appointment:', notification.appointmentId);

        try {
          // Fetch full appointment data with doctor and patient info
          const [appointmentData] = await db
            .select({
              id: appointments.id,
              appointmentDate: appointments.appointmentDate,
              status: appointments.status,
              price: appointments.price,
              zoomJoinUrl: appointments.zoomJoinUrl,
              patientId: appointments.patientId,
              doctorId: appointments.doctorId
            })
            .from(appointments)
            .where(eq(appointments.id, notification.appointmentId));

          if (appointmentData) {
            // Get doctor details with specialty
            const [doctorData] = await db
              .select({
                userId: doctors.userId,
                specialty: doctors.specialty,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email
              })
              .from(doctors)
              .innerJoin(users, eq(doctors.userId, users.id))
              .where(eq(doctors.id, appointmentData.doctorId));

            // Get patient timezone preference
            const userTimezone = userPrefs?.timezone || 'Europe/Paris';

            // Format appointment datetime in user's timezone
            const appointmentDatetimeLocal = appointmentData.appointmentDate
              ? formatInTimeZone(appointmentData.appointmentDate, userTimezone, 'EEEE, MMMM d, yyyy \\'at\\' h:mm a')
              : 'Your upcoming appointment';

            // Enrich merge data with full appointment details
            finalMergeData = {
              ...finalMergeData,
              appointment_id: appointmentData.id.toString(),
              appointment_datetime_utc: appointmentData.appointmentDate?.toISOString() || '',
              appointment_datetime_local: appointmentDatetimeLocal,
              patient_timezone: userTimezone,
              doctor_name: doctorData ? \`Dr. \${doctorData.firstName} \${doctorData.lastName}\`.trim() : 'Your doctor',
              doctor_specialization: doctorData?.specialty || 'General Practice',
              join_link: appointmentData.zoomJoinUrl || \`\${process.env.VITE_APP_URL}/consultation\`,
              price: appointmentData.price || '35.00',
              currency: '€'
            };

            console.log('✅ Appointment data enriched successfully');
          } else {
            console.warn(\`⚠️ Appointment \${notification.appointmentId} not found - using fallback data\`);
          }
        } catch (enrichmentError) {
          console.error('❌ Failed to enrich appointment data:', enrichmentError);
          // Continue with fallback data if enrichment fails
        }
      }

      console.log('📧 Final merge data keys:', Object.keys(finalMergeData));
      console.log('🌍 Using locale for email template:', userLocale);`;

if (content.includes(searchString)) {
  content = content.replace(searchString, replacementString);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully patched notificationService.ts with appointment enrichment logic');
  process.exit(0);
} else {
  console.error('❌ Could not find target string in file. File may have already been patched or structure changed.');
  process.exit(1);
}
