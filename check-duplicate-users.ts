import { db } from "./server/db";
import { users } from "./shared/schema";
import { or, eq } from "drizzle-orm";

async function checkDuplicates() {
  console.log('Checking for duplicate users...\n');
  
  // Find users with james.rodriguez email
  const jamesUsers = await db.select().from(users)
    .where(or(
      eq(users.email, 'james.rodriguez@doktu.com'),
      eq(users.email, 'james.rodríguez@doktu.com')
    ));
  
  console.log('Found users:');
  jamesUsers.forEach(user => {
    console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.firstName} ${user.lastName}, Phone: ${user.phone}, Role: ${user.role}`);
  });
  
  process.exit(0);
}

checkDuplicates();
