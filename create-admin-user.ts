import { storage } from './server/storage.js';

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail('admin@doktu.com');
    
    if (!existingAdmin) {
      console.log('Creating admin user...');
      
      const adminUser = await storage.createUser({
        email: 'admin@doktu.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        approved: true
      });
      
      console.log('✅ Admin user created:', adminUser);
      console.log('You can now log in with email: admin@doktu.com');
    } else {
      console.log('✅ Admin user already exists:', existingAdmin);
      
      // Update role to admin if it's not already
      if (existingAdmin.role !== 'admin') {
        console.log('Updating user role to admin...');
        const updatedUser = await storage.updateUser(existingAdmin.id.toString(), {
          role: 'admin',
          approved: true
        });
        console.log('✅ User role updated to admin:', updatedUser);
      }
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
}

createAdminUser();