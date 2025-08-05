import { db } from "./server/db";
import { doctors } from "./shared/schema";
import { eq } from "drizzle-orm";

async function updateJamesProfessional() {
  try {
    // Update doctor ID 9 (James Rodriguez)
    const [updatedDoctor] = await db
      .update(doctors)
      .set({
        specialty: "Pédiatrie",
        bio: "Experienced pediatrician specializing in childhood development and preventive care. Over 10 years of experience in both hospital and private practice settings.",
        education: "MD from Université Paris Descartes, Pediatric Residency at Hôpital Necker-Enfants Malades",
        experience: "10+ years in pediatric medicine, Former Chief Resident at Paris Children's Hospital",
        languages: ["French", "English", "Spanish"],
        rppsNumber: "10101923456",
        updatedAt: new Date()
      })
      .where(eq(doctors.id, 9))
      .returning();
    
    if (updatedDoctor) {
      console.log("✅ Successfully updated James Rodriguez's professional information:");
      console.log("  - Specialty:", updatedDoctor.specialty);
      console.log("  - Bio:", updatedDoctor.bio);
      console.log("  - Education:", updatedDoctor.education);
      console.log("  - Experience:", updatedDoctor.experience);
      console.log("  - Languages:", updatedDoctor.languages);
      console.log("  - RPPS Number:", updatedDoctor.rppsNumber);
    } else {
      console.log("❌ Failed to update doctor");
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

updateJamesProfessional();
