import { storage } from './server/storage.js';

async function updateAntoineToAdmin() {
  try {
    const email = 'antoine.vagnon@gmail.com';
    
    // Check if user exists
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser) {
      console.log('Found user:', existingUser);
      
      // Update to admin role
      const updatedUser = await storage.updateUser(existingUser.id.toString(), {
        role: 'admin',
        approved: true
      });
      
      console.log('✅ Successfully updated to admin:', updatedUser);
    } else {
      console.log('❌ User not found with email:', email);
      console.log('Please ensure the user has registered first.');
    }
  } catch (error) {
    console.error('❌ Error updating user:', error.message);
  }
}

updateAntoineToAdmin();