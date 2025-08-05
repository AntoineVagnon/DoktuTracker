import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function createAdminAccount() {
  console.log('Creating admin account for doktu@doktu.co...');
  
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'doktu@doktu.co'))
      .limit(1);
      
    if (existingUser.length > 0) {
      console.log('❌ User with email doktu@doktu.co already exists');
      console.log('User details:', existingUser[0]);
      return;
    }
    
    // Create the admin user
    const newUser = await db.insert(users).values({
      email: 'doktu@doktu.co',
      title: 'Admin',
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+33000000000',
      role: 'admin',
      approved: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log('✅ Admin account created successfully!');
    console.log('Email: doktu@doktu.co');
    console.log('Role: admin');
    console.log('User ID:', newUser[0].id);
    console.log('\nNote: You need to set the password through Supabase Auth.');
    console.log('The user can use "Forgot Password" to set their initial password.');
  } catch (error) {
    console.error('Error creating admin account:', error);
  }
}

createAdminAccount()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });