import { db } from "./server/db";
import { users, doctors, sessions } from "./shared/schema";
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
      await db.delete(doctors).where(eq(doctors.userId, 50));
      console.log("  ✓ Deleted duplicate doctor profile");
      
      // Delete any sessions for the duplicate
      await db.delete(sessions).where(eq(sessions.userId, 50));
      console.log("  ✓ Deleted duplicate sessions");
      
      // Delete the duplicate user
      await db.delete(users).where(eq(users.id, 50));
      console.log("  ✓ Deleted duplicate user account");
    }
    
    // Update the original account with the correct email
    console.log("\n📝 Updating original account email...");
    await db.update(users)
      .set({
        email: "james.rodriguez@doktu.com", // Update to the email you want
        updatedAt: new Date()
      })
      .where(eq(users.id, 39));
    
    console.log("✅ Successfully fixed email for original account (ID 39)");
    
    // Verify the fix
    const [fixedAccount] = await db.select().from(users).where(eq(users.id, 39));
    console.log("\n✅ Final state:");
    console.log(`  - ID: ${fixedAccount.id}`);
    console.log(`  - Email: ${fixedAccount.email}`);
    console.log(`  - Name: ${fixedAccount.firstName} ${fixedAccount.lastName}`);
    console.log(`  - Role: ${fixedAccount.role}`);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

fixDuplicateAccount();
