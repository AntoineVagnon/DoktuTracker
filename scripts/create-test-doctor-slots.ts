/**
 * Script to create future availability slots for test doctor
 * Run with: npx tsx scripts/create-test-doctor-slots.ts
 */

const API_URL = process.env.VITE_API_URL || 'https://web-production-b2ce.up.railway.app';
const TEST_DOCTOR_EMAIL = 'test.doctor.1760200122865@doktu.co';
const TEST_DOCTOR_PASSWORD = 'SecurePassword123!';

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

async function authenticateAsTestDoctor(): Promise<{ sessionId: string; doctorId: number; cookies: string }> {
  console.log('🔐 Authenticating as test doctor...');
  console.log(`Email: ${TEST_DOCTOR_EMAIL}`);

  const response = await fetch(`${API_URL}/api/test/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_DOCTOR_EMAIL,
      password: TEST_DOCTOR_PASSWORD
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ Authenticated as test doctor`);
  console.log(`Session ID: ${data.sessionId}`);
  console.log(`Doctor ID: ${data.user.doctorProfile?.id}`);

  // Extract session cookie
  const cookies = response.headers.get('set-cookie') || '';

  return {
    sessionId: data.sessionId,
    doctorId: data.user.doctorProfile?.id,
    cookies
  };
}

function generateFutureSlots(startDate: Date, days: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const timeSlots = [
    { start: '09:00:00', end: '09:30:00' },
    { start: '09:30:00', end: '10:00:00' },
    { start: '10:00:00', end: '10:30:00' },
    { start: '10:30:00', end: '11:00:00' },
    { start: '11:00:00', end: '11:30:00' },
    { start: '14:00:00', end: '14:30:00' },
    { start: '14:30:00', end: '15:00:00' },
    { start: '15:00:00', end: '15:30:00' },
    { start: '15:30:00', end: '16:00:00' },
    { start: '16:00:00', end: '16:30:00' },
  ];

  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);

    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = date.toISOString().split('T')[0];

    for (const slot of timeSlots) {
      slots.push({
        date: dateStr,
        startTime: slot.start,
        endTime: slot.end,
        isAvailable: true
      });
    }
  }

  return slots;
}

async function createSlotsForDoctor(doctorId: number, slots: TimeSlot[], sessionCookie: string) {
  console.log(`\n📅 Creating ${slots.length} slots for doctor ${doctorId}...`);

  let created = 0;
  let failed = 0;

  for (const slot of slots) {
    try {
      const response = await fetch(`${API_URL}/api/doctors/${doctorId}/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify(slot),
        credentials: 'include'
      });

      if (response.ok) {
        created++;
        if (created % 10 === 0) {
          console.log(`  ✅ Created ${created}/${slots.length} slots...`);
        }
      } else {
        failed++;
        if (failed === 1) {
          const errorText = await response.text();
          console.log(`  ❌ Failed to create slot: ${response.status} ${errorText}`);
        }
      }
    } catch (error) {
      failed++;
    }
  }

  console.log(`✅ Successfully created ${created} slots for doctor ${doctorId}`);
  if (failed > 0) {
    console.log(`⚠️  Failed to create ${failed} slots`);
  }
}

async function main() {
  try {
    console.log('🚀 Creating future availability slots for test doctor\n');

    // Authenticate as test doctor
    const { doctorId, cookies } = await authenticateAsTestDoctor();

    if (!doctorId) {
      throw new Error('Test doctor does not have a doctor profile');
    }

    // Generate slots for tomorrow and next 5 days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const slots = generateFutureSlots(tomorrow, 7);

    console.log(`📊 Generated ${slots.length} time slots (weekdays only)`);
    console.log(`   Morning slots: 09:00-11:30`);
    console.log(`   Afternoon slots: 14:00-16:30`);

    // Create slots for test doctor
    await createSlotsForDoctor(doctorId, slots, cookies);

    console.log('\n✅ All done! Slots created successfully.');
    console.log('\nVerify by visiting:');
    console.log(`  ${process.env.VITE_APP_URL || 'https://doktu-tracker.vercel.app'}/doctor/${doctorId}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
