import { db } from "./server/db";
import { users, doctors } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkUsers() {
  try {
    // List all users with doctor role
    const doctorUsers = await db.select().from(users).where(eq(users.role, "doctor"));
    
    console.log("=== DOCTOR USERS IN DATABASE ===");
    for (const user of doctorUsers) {
      console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.firstName} ${user.lastName}`);
    }
    
    // Check for James specifically
    console.log("\n=== SEARCHING FOR JAMES ===");
    const jamesUsers = await db.select().from(users);
    const james = jamesUsers.find(u => u.email?.includes("james") || u.firstName?.includes("James"));
    
    if (james) {
      console.log("Found James:", james);
    } else {
      console.log("James not found in users table");
    }
    
    // List all doctors
    console.log("\n=== ALL DOCTORS ===");
    const allDoctors = await db.select().from(doctors);
    for (const doc of allDoctors) {
      console.log(`Doctor ID: ${doc.id}, User ID: ${doc.userId}, Specialty: ${doc.specialty || "Not set"}`);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkUsers();
