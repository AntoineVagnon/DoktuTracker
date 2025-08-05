import { db } from "./server/db";
import { doctors, users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function fixDoctorProfile() {
  try {
    // Find the new user with ID 50
    const [newUser] = await db.select().from(users).where(eq(users.id, 50));
    
    if (!newUser) {
      console.log("❌ User ID 50 not found");
      return;
    }
    
    console.log("✅ Found user:", newUser.email, "ID:", newUser.id);
    
    // Check if doctor profile already exists for this user
    const [existingDoctor] = await db.select().from(doctors).where(eq(doctors.userId, 50));
    
    if (existingDoctor) {
      console.log("✅ Doctor profile already exists:", existingDoctor);
      return;
    }
    
    // Create doctor profile for user ID 50 with James's professional info
    const [newDoctor] = await db.insert(doctors).values({
      userId: 50,
      specialty: "Pédiatrie",
      bio: "Experienced pediatrician specializing in childhood development and preventive care. Over 10 years of experience in both hospital and private practice settings.",
      education: "MD from Université Paris Descartes, Pediatric Residency at Hôpital Necker-Enfants Malades",
      experience: "10+ years in pediatric medicine, Former Chief Resident at Paris Children's Hospital",
      languages: ["French", "English", "Spanish"],
      rppsNumber: "10101923456",
      consultationPrice: 60,
      rating: 4.5,
      reviewCount: 12
    }).returning();
    
    console.log("✅ Created doctor profile:", {
      id: newDoctor.id,
      userId: newDoctor.userId,
      specialty: newDoctor.specialty
    });
    
    // Also update the user's name fields
    await db.update(users)
      .set({
        title: "Dr.",
        firstName: "James",
        lastName: "Rodriguez",
        updatedAt: new Date()
      })
      .where(eq(users.id, 50));
    
    console.log("✅ Updated user name fields");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

fixDoctorProfile();
