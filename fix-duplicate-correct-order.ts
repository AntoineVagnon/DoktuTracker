import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function fixDuplicateUser() {
  console.log('Fixing duplicate user issue...\n');
  
  try {
    // Step 1: Delete duplicate user FIRST
    console.log('1. Removing duplicate user (ID 50)...');
    await db.delete(users).where(eq(users.id, 50));
    console.log('✅ Duplicate user removed');
    
    // Step 2: Now restore correct email to original user
    console.log('\n2. Restoring correct email to original user (ID 39)...');
    await db.update(users)
      .set({ 
        email: 'james.rodriguez@doktu.com',
        updatedAt: new Date()
      })
      .where(eq(users.id, 39));
    console.log('✅ Email restored to james.rodriguez@doktu.com');
    
    // Step 3: Verify the fix
    console.log('\n3. Verifying the fix...');
    const [fixedUser] = await db.select().from(users)
      .where(eq(users.id, 39));
    
    console.log('\n✅ User account restored:');
    console.log(`ID: ${fixedUser.id}`);
    console.log(`Email: ${fixedUser.email}`);
    console.log(`Name: ${fixedUser.firstName} ${fixedUser.lastName}`);
    console.log(`Phone: ${fixedUser.phone}`);
    console.log(`Role: ${fixedUser.role}`);
    
    console.log('\n✅ All fixed! Please log out and log back in with james.rodriguez@doktu.com');
    
  } catch (error) {
    console.error('Error fixing duplicate user:', error);
  }
  
  process.exit(0);
}

fixDuplicateUser();
