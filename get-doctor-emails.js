
#!/usr/bin/env node

import { db } from './server/db.js';
import { doctors, users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function getDoctorEmails() {
  console.log('🔍 Fetching all doctor emails...');
  
  try {
    const doctorData = await db
      .select({
        doctorId: doctors.id,
        userId: doctors.userId,
        specialty: doctors.specialty,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        title: users.title
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id));

    console.log('\n📧 Doctor Emails:');
    console.log('==================');
    
    doctorData.forEach((doctor, index) => {
      const fullName = [doctor.title, doctor.firstName, doctor.lastName]
        .filter(Boolean)
        .join(' ') || 'Unknown Name';
      
      console.log(`${index + 1}. ${fullName}`);
      console.log(`   Email: ${doctor.email}`);
      console.log(`   Specialty: ${doctor.specialty}`);
      console.log(`   Doctor ID: ${doctor.doctorId}`);
      console.log('');
    });

    console.log(`\nTotal doctors found: ${doctorData.length}`);
    
    // Just the emails in a simple list
    console.log('\n📋 Email list only:');
    console.log('===================');
    doctorData.forEach(doctor => {
      console.log(doctor.email);
    });

  } catch (error) {
    console.error('❌ Error fetching doctor emails:', error);
  } finally {
    process.exit(0);
  }
}

getDoctorEmails();
