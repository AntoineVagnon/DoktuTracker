import { db } from "./server/db";
import { doctors, users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function testDoctorAuth() {
  try {
    // Find James Rodriguez's user ID
    const [user] = await db.select().from(users).where(eq(users.email, "james.rodriguez@doktu.com"));
    
    if (!user) {
      console.log("❌ User not found");
      return;
    }
    
    console.log("✅ Found user:", user.email, "ID:", user.id);
    
    // Find doctor record for this user
    const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, user.id));
    
    if (doctor) {
      console.log("✅ Found doctor record:", {
        id: doctor.id,
        userId: doctor.userId,
        specialty: doctor.specialty || "Not set",
        bio: doctor.bio || "Not set",
        education: doctor.education || "Not set",
        experience: doctor.experience || "Not set",
        languages: doctor.languages || "Not set",
        rppsNumber: doctor.rppsNumber || "Not set"
      });
    } else {
      console.log("❌ No doctor record found for user ID:", user.id);
      console.log("Creating doctor record...");
      
      // Create doctor record
      const [newDoctor] = await db.insert(doctors).values({
        userId: user.id,
        specialty: "General Medicine",
        bio: "Experienced physician",
        education: "Medical degree",
        experience: "10+ years",
        languages: ["French", "English"],
        rppsNumber: "123456789",
        consultationPrice: 60
      }).returning();
      
      console.log("✅ Created doctor record:", newDoctor);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

testDoctorAuth();
