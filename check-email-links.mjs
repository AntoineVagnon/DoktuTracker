import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const u = new URL(process.env.DATABASE_URL);
const sql = postgres({
  host: u.hostname,
  port: Number(u.port) || 5432,
  database: u.pathname.slice(1),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password || ''),
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

console.log('\n🔍 Checking Email Links in Latest Booking');
console.log('═'.repeat(80));

try {
  // Get the most recent appointment
  const [appointment] = await sql`
    SELECT id, zoom_join_url, appointment_date
    FROM appointments
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!appointment) {
    console.log('❌ No appointments found');
    process.exit(0);
  }

  console.log(`\n📅 Latest Appointment: #${appointment.id}`);
  console.log(`   Zoom Join URL: ${appointment.zoom_join_url || 'Not set'}`);
  console.log(`   Date: ${appointment.appointment_date}`);

  // Check notification_queue for this appointment
  const queueEntries = await sql`
    SELECT
      id,
      email_html,
      email_text,
      email_subject,
      trigger_code
    FROM notification_queue
    WHERE appointment_id = ${appointment.id}
    AND email_html IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (queueEntries.length > 0) {
    const email = queueEntries[0];
    console.log(`\n📧 Email Subject: ${email.email_subject}`);
    console.log(`\n🔗 Links Found in Email HTML:`);
    console.log('─'.repeat(80));

    // Extract all links from HTML
    const linkRegex = /href=["']([^"']+)["']/g;
    const links = [];
    let match;

    while ((match = linkRegex.exec(email.email_html)) !== null) {
      if (!links.includes(match[1])) {
        links.push(match[1]);
      }
    }

    links.forEach((link, index) => {
      console.log(`   ${index + 1}. ${link}`);
    });

    // Check for potential Bitdefender flags
    console.log(`\n⚠️  Potential Issues:`);
    console.log('─'.repeat(80));

    const potentialIssues = [];

    links.forEach(link => {
      if (link.includes('railway.app')) {
        potentialIssues.push(`Railway URL: ${link}`);
      }
      if (link.includes('.co/') || link.endsWith('.co')) {
        potentialIssues.push(`.co domain: ${link}`);
      }
      if (link.includes('vercel.app')) {
        potentialIssues.push(`Vercel URL: ${link}`);
      }
      if (!link.startsWith('http://') && !link.startsWith('https://')) {
        potentialIssues.push(`Relative URL: ${link}`);
      }
    });

    if (potentialIssues.length > 0) {
      potentialIssues.forEach(issue => console.log(`   ⚠️  ${issue}`));
    } else {
      console.log('   ✅ No obvious issues detected');
    }

    console.log(`\n📋 Environment Configuration:`);
    console.log('─'.repeat(80));
    console.log(`   VITE_APP_URL: ${process.env.VITE_APP_URL || 'Not set (defaults to https://app.doktu.co)'}`);
    console.log(`   VITE_API_URL: ${process.env.VITE_API_URL || 'Not set'}`);

  } else {
    console.log('\n⚠️  No email HTML found in notification queue');
  }

} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await sql.end();
}
