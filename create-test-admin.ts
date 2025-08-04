import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function createTestAdmin() {
  try {
    // Check if admin exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'test.admin@doktu.com'));
    
    if (existingAdmin.length === 0) {
      // Create admin user
      await db.insert(users).values({
        email: 'test.admin@doktu.com',
        role: 'admin',
        title: 'Mr',
        firstName: 'Test',
        lastName: 'Admin',
        supabaseId: 'test-admin-' + Date.now()
      });
      console.log('✅ Test admin user created: test.admin@doktu.com');
    } else {
      console.log('ℹ️ Test admin already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test admin:', error);
    process.exit(1);
  }
}

createTestAdmin();
