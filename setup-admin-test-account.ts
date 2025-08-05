import { db } from './server/db';
import { users, testAccounts } from './shared/schema';
import { eq } from 'drizzle-orm';

async function setupAdminTestAccount() {
  console.log('Setting up admin test account for doktu@doktu.co...');
  
  try {
    // First, ensure the user exists with admin role
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'doktu@doktu.co'))
      .limit(1);
      
    let userId;
    if (existingUser.length > 0) {
      // Update existing user to ensure it's an admin
      await db
        .update(users)
        .set({ 
          role: 'admin',
          approved: true,
          updatedAt: new Date()
        })
        .where(eq(users.email, 'doktu@doktu.co'));
      userId = existingUser[0].id;
      console.log('✓ Updated existing user to admin role');
    } else {
      // Create new admin user
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
      userId = newUser[0].id;
      console.log('✓ Created new admin user');
    }
    
    // Check if test account already exists
    const existingTestAccount = await db
      .select()
      .from(testAccounts)
      .where(eq(testAccounts.email, 'doktu@doktu.co'))
      .limit(1);
      
    if (existingTestAccount.length > 0) {
      // Update existing test account
      await db
        .update(testAccounts)
        .set({
          password: 'Admin123456!',
          token: `temp_token_${Date.now()}`,
          userId: userId,
          createdAt: new Date()
        })
        .where(eq(testAccounts.email, 'doktu@doktu.co'));
      console.log('✓ Updated existing test account');
    } else {
      // Create new test account
      await db.insert(testAccounts).values({
        email: 'doktu@doktu.co',
        password: 'Admin123456!',
        token: `temp_token_${Date.now()}`,
        userId: userId,
        createdAt: new Date()
      });
      console.log('✓ Created new test account');
    }
    
    console.log('\n✅ Admin test account setup complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: doktu@doktu.co');
    console.log('Password: Admin123456!');
    console.log('Role: admin');
    console.log('User ID:', userId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nYou can now login with these credentials.');
    
  } catch (error) {
    console.error('Error setting up admin test account:', error);
  }
}

setupAdminTestAccount()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });