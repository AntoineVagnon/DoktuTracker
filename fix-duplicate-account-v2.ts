import { db } from "./server/db";
import { users, doctors } from "./shared/schema";
import { eq, or } from "drizzle-orm";

async function fixDuplicateAccount() {
  try {
    console.log("🔍 Finding duplicate accounts...");
    
    // Find both James accounts
    const jamesAccounts = await db.select().from(users)
      .where(or(
        eq(users.email, "james.rodriguez@doktu.com"),
        eq(users.email, "james.rodriguez@doktu.co")
      ));
    
    console.log(`Found ${jamesAccounts.length} James accounts:`);
    jamesAccounts.forEach(acc => {
      console.log(`  - ID: ${acc.id}, Email: ${acc.email}, Created: ${acc.createdAt}`);
    });
    
    // The original account should be ID 39 with email james.rodriguez@doktu.co
    const originalAccount = jamesAccounts.find(acc => acc.id === 39);
    const duplicateAccount = jamesAccounts.find(acc => acc.id === 50);
    
    if (!originalAccount) {
      console.log("❌ Original account (ID 39) not found");
      return;
    }
    
    if (duplicateAccount) {
      console.log("\n🗑️ Removing duplicate account (ID 50)...");
      
      // First delete any doctor profiles for the duplicate
      const deletedDoctors = await db.delete(doctors).where(eq(doctors.userId, 50)).returning();
      console.log(`  ✓ Deleted ${deletedDoctors.length} duplicate doctor profile(s)`);
      
      // Delete the duplicate user
      const deletedUsers = await db.delete(users).where(eq(users.id, 50)).returning();
      console.log(`  ✓ Deleted ${deletedUsers.length} duplicate user account(s)`);
    }
    
    // Update the original account with the correct email
    console.log("\n📝 Updating original account email...");
    const [updatedUser] = await db.update(users)
      .set({
        email: "james.rodriguez@doktu.com", // Update to the email you want
        updatedAt: new Date()
      })
      .where(eq(users.id, 39))
      .returning();
    
    if (updatedUser) {
      console.log("✅ Successfully fixed email for original account (ID 39)");
      
      // Verify the fix
      console.log("\n✅ Final state:");
      console.log(`  - ID: ${updatedUser.id}`);
      console.log(`  - Email: ${updatedUser.email}`);
      console.log(`  - Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
      console.log(`  - Role: ${updatedUser.role}`);
      
      // Check doctor profile
      const [doctorProfile] = await db.select().from(doctors).where(eq(doctors.userId, 39));
      if (doctorProfile) {
        console.log("\n✅ Doctor profile intact:");
        console.log(`  - Doctor ID: ${doctorProfile.id}`);
        console.log(`  - Specialty: ${doctorProfile.specialty}`);
        console.log(`  - RPPS: ${doctorProfile.rppsNumber}`);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

fixDuplicateAccount();
