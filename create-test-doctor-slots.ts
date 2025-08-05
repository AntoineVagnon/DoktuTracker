import { db } from './server/db';
import { doctorTimeSlots } from './shared/schema';

async function createTestDoctorSlots() {
  console.log('Creating test time slots for doctors...');
  
  // Get the next 7 days of dates
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  // Time slots for different doctors
  const doctorSlots = [
    // Doctor 9 (James Rodriguez) - Many slots with high rating
    { doctorId: 9, times: ['09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '14:00:00', '14:30:00', '15:00:00', '16:00:00'] },
    // Doctor 8 - Some slots
    { doctorId: 8, times: ['11:00:00', '11:30:00', '15:00:00', '15:30:00'] },
    // Doctor 10 - Few slots  
    { doctorId: 10, times: ['14:00:00', '16:00:00'] },
    // Doctor 11 - Many slots
    { doctorId: 11, times: ['09:00:00', '10:00:00', '11:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00'] },
    // Doctor 12 - No slots (to show unavailable)
    { doctorId: 12, times: [] },
    // Doctor 13 - One slot
    { doctorId: 13, times: ['10:00:00'] }
  ];
  
  const slotsToInsert = [];
  
  for (const doctor of doctorSlots) {
    for (const date of dates) {
      for (const time of doctor.times) {
        slotsToInsert.push({
          doctorId: doctor.doctorId,
          date: date,
          startTime: time,
          endTime: addMinutes(time, 30),
          isAvailable: true
        });
      }
    }
  }
  
  if (slotsToInsert.length > 0) {
    await db.insert(doctorTimeSlots).values(slotsToInsert);
    console.log(`✅ Created ${slotsToInsert.length} time slots for doctors`);
  }
  
  // Show summary
  for (const doctor of doctorSlots) {
    const slotCount = doctor.times.length * dates.length;
    console.log(`Doctor ${doctor.doctorId}: ${slotCount} slots`);
  }
}

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}:00`;
}

createTestDoctorSlots()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });