
import { db } from "./db";
import { doctors } from "../shared/schema";

const sampleDoctors = [
  {
    firstName: "Marie",
    lastName: "Dubois",
    specialty: "Cardiology",
    email: "marie.dubois@doktu.fr",
    avatarUrl: null,
    avgRating: 4.8,
  },
  {
    firstName: "Jean",
    lastName: "Martin",
    specialty: "Dermatology", 
    email: "jean.martin@doktu.fr",
    avatarUrl: null,
    avgRating: 4.9,
  },
  {
    firstName: "Sophie",
    lastName: "Bernard",
    specialty: "Pediatrics",
    email: "sophie.bernard@doktu.fr", 
    avatarUrl: null,
    avgRating: 4.7,
  },
  {
    firstName: "Pierre",
    lastName: "Moreau",
    specialty: "Orthopedics",
    email: "pierre.moreau@doktu.fr",
    avatarUrl: null,
    avgRating: 4.6,
  },
  {
    firstName: "Camille",
    lastName: "Petit",
    specialty: "Psychiatry",
    email: "camille.petit@doktu.fr",
    avatarUrl: null,
    avgRating: null, // New doctor
  },
  {
    firstName: "Nicolas",
    lastName: "Durand",
    specialty: "Neurology",
    email: "nicolas.durand@doktu.fr",
    avatarUrl: null,
    avgRating: 4.5,
  },
  {
    firstName: "Julie",
    lastName: "Leroy",
    specialty: "Gynecology",
    email: "julie.leroy@doktu.fr",
    avatarUrl: null,
    avgRating: 4.8,
  },
  {
    firstName: "Thomas",
    lastName: "Roux",
    specialty: "Ophthalmology",
    email: "thomas.roux@doktu.fr",
    avatarUrl: null,
    avgRating: 4.9,
  },
  {
    firstName: "Isabelle",
    lastName: "Fournier",
    specialty: "Endocrinology",
    email: "isabelle.fournier@doktu.fr",
    avatarUrl: null,
    avgRating: 4.7,
  },
  {
    firstName: "Antoine",
    lastName: "Michel",
    specialty: "Rheumatology",
    email: "antoine.michel@doktu.fr",
    avatarUrl: null,
    avgRating: null, // New doctor
  },
];

export async function seedDoctors() {
  try {
    console.log("Seeding doctors...");
    
    // Check if doctors already exist
    const existingDoctors = await db.select().from(doctors);
    if (existingDoctors.length >= 10) {
      console.log("Doctors already seeded");
      return;
    }

    // Insert sample doctors
    await db.insert(doctors).values(sampleDoctors);
    console.log(`Seeded ${sampleDoctors.length} doctors`);
  } catch (error) {
    console.error("Error seeding doctors:", error);
  }
}
