import { createClient } from "@neondatabase/serverless";
import dotenv from 'dotenv';

dotenv.config();

const sql = createClient(process.env.DATABASE_URL);

async function checkAdminUsers() {
  try {
    // Check for existing admin users
    const adminUsers = await sql`
      SELECT id, email, first_name, last_name, role 
      FROM users 
      WHERE role = 'admin'
    `;
    
    console.log('Existing admin users:', adminUsers);
    
    if (adminUsers.length === 0) {
      console.log('\nNo admin users found. Creating one...');
      
      // Create an admin user
      const newAdmin = await sql`
        INSERT INTO users (email, first_name, last_name, role, approved, created_at, updated_at)
        VALUES ('admin@doktu.com', 'Admin', 'User', 'admin', true, NOW(), NOW())
        RETURNING id, email, first_name, last_name, role
      `;
      
      console.log('Created admin user:', newAdmin);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAdminUsers();