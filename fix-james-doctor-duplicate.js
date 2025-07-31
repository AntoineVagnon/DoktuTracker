#!/usr/bin/env tsx

// Script to fix James Rodriguez doctor duplicate issue
// Problem: Two doctors with similar emails cause appointment mapping issues
// Solution: Remove duplicate and fix email of the legitimate doctor

const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');
const { doctors, users, appointments } = require('./shared/schema.ts');
const { eq, and } = require('drizzle-orm');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function fixJamesDoctorDuplicate() {
  console.log('🔧 Starting James Rodriguez doctor duplicate fix...');
  
  try {
    // 1. Find both James Rodriguez doctors
    const allDoctors = await db
      .select({
        doctorId: doctors.id,
        userId: doctors.userId,
        specialty: doctors.specialty,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(
        eq(users.firstName, 'James'),
        eq(users.lastName, 'Rodriguez')
      ));
    
    console.log('Found James Rodriguez doctors:', allDoctors);
    
    if (allDoctors.length !== 2) {
      console.log(`❌ Expected 2 James Rodriguez doctors, found ${allDoctors.length}`);
      return;
    }
    
    // 2. Identify the legitimate doctor (with appointments) vs the duplicate
    const doctorWithAppointments = allDoctors.find(d => d.specialty === 'Pédiatrie'); // The real one
    const duplicateDoctor = allDoctors.find(d => d.specialty === 'General Practice'); // The auto-created one
    
    if (!doctorWithAppointments || !duplicateDoctor) {
      console.log('❌ Could not identify legitimate vs duplicate doctor');
      return;
    }
    
    console.log('Legitimate doctor (keeping):', doctorWithAppointments);
    console.log('Duplicate doctor (removing):', duplicateDoctor);
    
    // 3. Check appointments for both doctors
    const legitimateAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.doctorId, doctorWithAppointments.doctorId));
    
    const duplicateAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.doctorId, duplicateDoctor.doctorId));
    
    console.log(`Legitimate doctor has ${legitimateAppointments.length} appointments`);
    console.log(`Duplicate doctor has ${duplicateAppointments.length} appointments`);
    
    // 4. If duplicate has appointments, move them to legitimate doctor
    if (duplicateAppointments.length > 0) {
      console.log('🔄 Moving appointments from duplicate to legitimate doctor...');
      await db
        .update(appointments)
        .set({ doctorId: doctorWithAppointments.doctorId })
        .where(eq(appointments.doctorId, duplicateDoctor.doctorId));
      console.log(`✅ Moved ${duplicateAppointments.length} appointments`);
    }
    
    // 5. Update the legitimate doctor's user email to @doktu.com
    console.log('📧 Updating legitimate doctor email to @doktu.com...');
    await db
      .update(users)
      .set({ email: 'james.rodriguez@doktu.com' })
      .where(eq(users.id, doctorWithAppointments.userId));
    console.log('✅ Updated email');
    
    // 6. Delete the duplicate doctor record
    console.log('🗑️ Removing duplicate doctor record...');
    await db
      .delete(doctors)
      .where(eq(doctors.id, duplicateDoctor.doctorId));
    console.log('✅ Deleted duplicate doctor');
    
    // 7. Delete the duplicate user record
    console.log('🗑️ Removing duplicate user record...');
    await db
      .delete(users)
      .where(eq(users.id, duplicateDoctor.userId));
    console.log('✅ Deleted duplicate user');
    
    // 8. Verify the fix
    console.log('🔍 Verifying fix...');
    const remainingJamesDoctors = await db
      .select({
        doctorId: doctors.id,
        userId: doctors.userId,
        specialty: doctors.specialty,
        email: users.email
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(
        eq(users.firstName, 'James'),
        eq(users.lastName, 'Rodriguez')
      ));
    
    console.log('Remaining James Rodriguez doctors:', remainingJamesDoctors);
    
    if (remainingJamesDoctors.length === 1 && remainingJamesDoctors[0].email === 'james.rodriguez@doktu.com') {
      console.log('✅ Fix completed successfully!');
      console.log(`James Rodriguez is now unified as doctorId=${remainingJamesDoctors[0].doctorId} with email james.rodriguez@doktu.com`);
    } else {
      console.log('❌ Fix verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixJamesDoctorDuplicate();