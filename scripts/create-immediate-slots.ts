/**
 * Script to create immediate availability slots for test doctor (bypassing 1-hour buffer)
 * Run with: npx tsx scripts/create-immediate-slots.ts
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

function generateImmediateSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();

  // Round to next 30-minute mark
  const minutes = now.getMinutes();
  const roundedMinutes = minutes < 30 ? 30 : 60;
  now.setMinutes(roundedMinutes, 0, 0);

  if (roundedMinutes === 60) {
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
  }

  const today = now.toISOString().split('T')[0];

  // Create slots starting from now, every 30 minutes for next 4 hours
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(now.getTime() + (i * 30 * 60 * 1000));
    const endTime = new Date(startTime.getTime() + (30 * 60 * 1000));

    const startTimeStr = startTime.toTimeString().split(' ')[0];
    const endTimeStr = endTime.toTimeString().split(' ')[0];

    slots.push({
      date: today,
      startTime: startTimeStr,
      endTime: endTimeStr,
      isAvailable: true
    });
  }

  return slots;
}

async function createSlotsForDoctor(doctorId: number, slots: TimeSlot[], sessionCookie: string) {
  console.log(`\n📅 Creating ${slots.length} IMMEDIATE slots for doctor ${doctorId}...`);
  console.log(`⚠️  Bypassing 1-hour buffer rule for testing\n`);

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
        console.log(`  ✅ Created slot: ${slot.date} ${slot.startTime}-${slot.endTime}`);
      } else {
        failed++;
        if (failed === 1) {
          const errorText = await response.text();
          console.log(`  ❌ Failed to create slot: ${response.status} ${errorText}`);
        }
      }
    } catch (error) {
      failed++;
      console.log(`  ❌ Error creating slot: ${error}`);
    }
  }

  console.log(`\n✅ Successfully created ${created} slots`);
  if (failed > 0) {
    console.log(`⚠️  Failed to create ${failed} slots`);
  }
}

async function main() {
  try {
    console.log('🚀 Creating IMMEDIATE availability slots for test doctor\n');
    console.log('⚠️  This bypasses the 1-hour buffer rule for E2E testing\n');

    // Authenticate as test doctor
    const { doctorId, cookies } = await authenticateAsTestDoctor();

    if (!doctorId) {
      throw new Error('Test doctor does not have a doctor profile');
    }

    // Generate immediate slots (starting now)
    const slots = generateImmediateSlots();

    console.log(`📊 Generated ${slots.length} immediate time slots`);
    console.log(`   Starting from: ${slots[0].date} ${slots[0].startTime}`);
    console.log(`   Ending at: ${slots[slots.length - 1].date} ${slots[slots.length - 1].endTime}`);

    // Create slots for test doctor
    await createSlotsForDoctor(doctorId, slots, cookies);

    console.log('\n✅ All done! Immediate slots created successfully.');
    console.log('\n🧪 You can now run E2E booking tests with these slots:');
    console.log(`  ${process.env.VITE_APP_URL || 'https://doktu-tracker.vercel.app'}/doctor/${doctorId}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
