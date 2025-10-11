import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestDoctor() {
  console.log('🏥 Creating test doctor account...\n');

  const doctorEmail = 'test.doctor@doktu.co';
  const doctorPassword = 'TestDoctor123!';

  try {
    // 1. Create Supabase auth user
    console.log('Step 1: Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: doctorEmail,
      password: doctorPassword,
      email_confirm: true,
      user_metadata: {
        role: 'doctor',
        firstName: 'Test',
        lastName: 'Doctor'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists, using existing account');
        const { data: { user } } = await supabase.auth.admin.getUserById(authError.message);
        if (!user) {
          // Try to get user by email
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingUser = users.users.find(u => u.email === doctorEmail);
          if (existingUser) {
            console.log('✅ Found existing user:', existingUser.id);
          } else {
            throw new Error('User exists but cannot be found');
          }
        }
      } else {
        throw authError;
      }
    } else {
      console.log('✅ Auth user created:', authData.user.id);
    }

    // Get the user ID
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === doctorEmail);

    if (!authUser) {
      throw new Error('Could not find created user');
    }

    console.log('\nStep 2: Creating user profile...');

    // Check if user already exists in users table
    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .eq('email', doctorEmail);

    let userId: number;

    if (existingUsers && existingUsers.length > 0) {
      console.log('⚠️  User profile already exists');
      userId = existingUsers[0].id;
    } else {
      // 2. Create user in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: doctorEmail,
          firstName: 'Test',
          lastName: 'Doctor',
          role: 'doctor',
          phoneNumber: '+33612345678',
          createdAt: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) throw userError;
      console.log('✅ User profile created:', userData.id);
      userId = userData.id;
    }

    console.log('\nStep 3: Creating doctor profile...');

    // Check if doctor already exists
    const { data: existingDoctors } = await supabase
      .from('doctors')
      .select('*')
      .eq('userId', authUser.id);

    if (existingDoctors && existingDoctors.length > 0) {
      console.log('⚠️  Doctor profile already exists');
      console.log('Doctor ID:', existingDoctors[0].id);
    } else {
      // 3. Create doctor profile
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .insert({
          userId: authUser.id,
          firstName: 'Test',
          lastName: 'Doctor',
          email: doctorEmail,
          specialization: 'General Medicine',
          title: 'Dr.',
          bio: 'Test doctor account for automated testing and QA purposes.',
          licenseNumber: 'TEST-' + Date.now(),
          yearsOfExperience: 10,
          consultationFee: 35.00,
          languages: ['English', 'French'],
          rating: 5.0,
          reviewCount: 0,
          verified: true,
          acceptingNewPatients: true,
          createdAt: new Date().toISOString()
        })
        .select()
        .single();

      if (doctorError) throw doctorError;
      console.log('✅ Doctor profile created:', doctorData.id);
    }

    console.log('\n✅ Test doctor account created successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:', doctorEmail);
    console.log('🔑 Password:', doctorPassword);
    console.log('═══════════════════════════════════════');
    console.log('\nYou can now use these credentials for testing.');
    console.log('Login at: https://doktu-tracker.vercel.app\n');

  } catch (error: any) {
    console.error('\n❌ Error creating test doctor:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTestDoctor();
