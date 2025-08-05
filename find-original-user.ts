import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function findOriginalUser() {
  console.log('Looking for original user account...\n');
  
  // Check user ID 39 (the original)
  const originalUser = await db.select().from(users)
    .where(eq(users.id, 39));
  
  if (originalUser.length > 0) {
    const user = originalUser[0];
    console.log('Original user (ID 39):');
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Phone: ${user.phone}`);
    console.log(`Role: ${user.role}`);
  } else {
    console.log('Original user ID 39 not found');
  }
  
  // Also check what happened to user 50
  const newUser = await db.select().from(users)
    .where(eq(users.id, 50));
    
  if (newUser.length > 0) {
    const user = newUser[0];
    console.log('\nNew duplicate user (ID 50):');
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Phone: ${user.phone}`);
    console.log(`Role: ${user.role}`);
  }
  
  process.exit(0);
}

findOriginalUser();
