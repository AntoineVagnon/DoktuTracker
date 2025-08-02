#!/usr/bin/env tsx
import { storage } from './server/storage.js';

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: npx tsx admin-cli.ts <email> <firstName> <lastName>');
  console.log('Example: npx tsx admin-cli.ts john@doktu.com John Doe');
  process.exit(1);
}

const [email, firstName, lastName] = args;

async function createAdmin() {
  try {
    const existingUser = await storage.getUserByEmail(email);
    
    if (!existingUser) {
      const adminUser = await storage.createUser({
        email,
        firstName,
        lastName,
        role: 'admin',
        approved: true
      });
      
      console.log('✅ Admin created:', {
        id: adminUser.id,
        email: adminUser.email,
        name: `${adminUser.firstName} ${adminUser.lastName}`
      });
    } else if (existingUser.role !== 'admin') {
      await storage.updateUser(existingUser.id.toString(), {
        role: 'admin',
        approved: true
      });
      console.log('✅ Upgraded to admin:', email);
    } else {
      console.log('⚠️ Already an admin:', email);
    }
    
    console.log('\n📧 Next steps:');
    console.log('1. Tell the user to go to the login page');
    console.log('2. Click "Forgot Password"');
    console.log(`3. Enter email: ${email}`);
    console.log('4. Check email for password reset link');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

createAdmin();