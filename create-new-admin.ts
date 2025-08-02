import { storage } from './server/storage.js';

// Modify these values for each new admin
const NEW_ADMIN_EMAIL = 'newadmin@doktu.com'; // Change this
const NEW_ADMIN_FIRST_NAME = 'New'; // Change this
const NEW_ADMIN_LAST_NAME = 'Admin'; // Change this

async function createNewAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail(NEW_ADMIN_EMAIL);
    
    if (!existingAdmin) {
      console.log(`Creating admin user: ${NEW_ADMIN_EMAIL}...`);
      
      const adminUser = await storage.createUser({
        email: NEW_ADMIN_EMAIL,
        firstName: NEW_ADMIN_FIRST_NAME,
        lastName: NEW_ADMIN_LAST_NAME,
        role: 'admin',
        approved: true
      });
      
      console.log('✅ Admin user created:', adminUser);
      console.log(`You can now log in with email: ${NEW_ADMIN_EMAIL}`);
      console.log('Remember to use the "Forgot Password" flow to set a password');
    } else {
      console.log('⚠️ User already exists:', existingAdmin);
      
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

createNewAdmin();