import { db } from "./db";
import { users, doctors, doctorTimeSlots } from "@shared/schema";
import { nanoid } from "nanoid";
import { supabase } from "./supabaseAuth";

const sampleDoctors = [
  {
    firstName: "Sarah",
    lastName: "Miller",
    specialty: "Cardiology",
    bio: "Dr. Sarah Miller is a board-certified cardiologist with over 15 years of experience treating heart conditions and cardiovascular disease.",
    education: "Harvard Medical School, MD",
    experience: "15+ years",
    languages: ["English", "French"],
    rppsNumber: "10003456789",
    consultationPrice: "35.00",
    rating: "4.9",
    reviewCount: 127,
    profileImageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face"
  },
  {
    firstName: "Michael",
    lastName: "Chen",
    specialty: "Dermatology",
    bio: "Specialized in skin cancer detection and cosmetic dermatology with a focus on minimally invasive treatments.",
    education: "Stanford University School of Medicine, MD",
    experience: "12+ years",
    languages: ["English", "Mandarin"],
    rppsNumber: "10003456790",
    consultationPrice: "35.00",
    rating: "4.8",
    reviewCount: 89,
    profileImageUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face"
  },
  {
    firstName: "Emma",
    lastName: "Rodriguez",
    specialty: "Pediatrics",
    bio: "Passionate about children's health with expertise in developmental disorders and preventive care.",
    education: "Johns Hopkins School of Medicine, MD",
    experience: "10+ years",
    languages: ["English", "Spanish"],
    rppsNumber: "10003456791",
    consultationPrice: "35.00",
    rating: "4.7",
    reviewCount: 156,
    profileImageUrl: "https://images.unsplash.com/photo-1594824309293-e3ed3a647ab7?w=400&h=400&fit=crop&crop=face"
  },
  {
    firstName: "David",
    lastName: "Thompson",
    specialty: "Internal Medicine",
    bio: "General internal medicine physician focusing on preventive care and chronic disease management.",
    education: "Mayo Clinic Alix School of Medicine, MD",
    experience: "18+ years",
    languages: ["English"],
    rppsNumber: "10003456792",
    consultationPrice: "35.00",
    rating: "4.6",
    reviewCount: 203,
    profileImageUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face"
  },
  {
    firstName: "Lisa",
    lastName: "Wang",
    specialty: "Psychiatry",
    bio: "Mental health specialist with focus on anxiety, depression, and cognitive behavioral therapy.",
    education: "UCLA David Geffen School of Medicine, MD",
    experience: "8+ years",
    languages: ["English", "Mandarin"],
    rppsNumber: "10003456793",
    consultationPrice: "35.00",
    rating: "4.9",
    reviewCount: 74,
    profileImageUrl: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=400&fit=crop&crop=face"
  },
  {
    firstName: "James",
    lastName: "Anderson",
    specialty: "Orthopedics",
    bio: "Orthopedic surgeon specializing in sports medicine and joint replacement surgery.",
    education: "Duke University School of Medicine, MD",
    experience: "20+ years",
    languages: ["English"],
    rppsNumber: "10003456794",
    consultationPrice: "35.00",
    rating: "4.8",
    reviewCount: 145,
    profileImageUrl: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop&crop=face"
  },
  {
    firstName: "Maria",
    lastName: "Garcia",
    specialty: "Gynecology",
    bio: "Women's health specialist with expertise in reproductive health and minimally invasive procedures.",
    education: "University of Pennsylvania Perelman School of Medicine, MD",
    experience: "14+ years",
    languages: ["English", "Spanish"],
    rppsNumber: "10003456795",
    consultationPrice: "35.00",
    rating: "4.7",
    reviewCount: 98,
    profileImageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=face"
  },
  {
    firstName: "Robert",
    lastName: "Kim",
    specialty: "Neurology",
    bio: "Neurologist specializing in movement disorders, epilepsy, and headache management.",
    education: "Northwestern University Feinberg School of Medicine, MD",
    experience: "16+ years",
    languages: ["English", "Korean"],
    rppsNumber: "10003456796",
    consultationPrice: "35.00",
    rating: "4.9",
    reviewCount: 112,
    profileImageUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face"
  },
  {
    firstName: "Jennifer",
    lastName: "Brown",
    specialty: "Endocrinology",
    bio: "Endocrinologist focusing on diabetes management, thyroid disorders, and hormone therapy.",
    education: "Vanderbilt University School of Medicine, MD",
    experience: "11+ years",
    languages: ["English"],
    rppsNumber: "10003456797",
    consultationPrice: "35.00",
    rating: "4.6",
    reviewCount: 67,
    profileImageUrl: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&h=400&fit=crop&crop=face"
  },
  {
    firstName: "Alexander",
    lastName: "Petrov",
    specialty: "Ophthalmology",
    bio: "Eye specialist with expertise in cataract surgery, retinal diseases, and vision correction.",
    education: "Columbia University Vagelos College of Physicians and Surgeons, MD",
    experience: "13+ years",
    languages: ["English", "Russian"],
    rppsNumber: "10003456798",
    consultationPrice: "35.00",
    rating: "4.8",
    reviewCount: 93,
    profileImageUrl: "https://images.unsplash.com/photo-1643297654416-05795882dd98?w=400&h=400&fit=crop&crop=face"
  }
];

function generateTimeSlots(doctorId: string) {
  const slots = [];
  const now = new Date();
  
  // Generate slots for the next 7 days
  for (let day = 1; day <= 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    date.setHours(9, 0, 0, 0); // Start at 9 AM
    
    // Generate 2-3 slots per day
    const slotsPerDay = Math.floor(Math.random() * 2) + 2; // 2-3 slots
    
    for (let slot = 0; slot < slotsPerDay; slot++) {
      const startTime = new Date(date);
      startTime.setHours(9 + slot * 3); // 9 AM, 12 PM, 3 PM
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 30); // 30-minute slots
      
      slots.push({
        doctorId,
        date: startTime.toISOString().split('T')[0],
        startTime: startTime.toTimeString().split(' ')[0],
        endTime: endTime.toTimeString().split(' ')[0],
        isAvailable: true
      });
    }
  }
  
  return slots;
}

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");
  
  try {
    // Create users and doctors
    for (const doctorData of sampleDoctors) {
      const email = `${doctorData.firstName.toLowerCase()}.${doctorData.lastName.toLowerCase()}@doktu.com`;
      // Use environment variable for seeding password, fallback to secure generated password
      const password = process.env.SEED_DOCTOR_PASSWORD || `TempPass_${nanoid(12)}_2025!`;
      
      // Log password for development (remove in production)
      if (!process.env.SEED_DOCTOR_PASSWORD) {
        console.log(`🔑 Generated password for ${email}: ${password}`);
      }
      
      // Create Supabase Auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: doctorData.firstName,
          last_name: doctorData.lastName,
          role: 'doctor'
        }
      });

      if (authError) {
        console.error(`❌ Failed to create auth user for ${email}:`, authError);
        continue;
      }

      if (!authData.user) {
        console.error(`❌ No user data returned for ${email}`);
        continue;
      }

      // Create user record in database
      await db.insert(users).values({
        id: parseInt(authData.user.id), // Convert UUID to integer if needed
        username: email.split('@')[0],
        email: email,
        role: "doctor",
        approved: true
      });
      
      // Create doctor profile
      const [doctor] = await db.insert(doctors).values({
        userId: authData.user.id,
        specialty: doctorData.specialty,
        bio: doctorData.bio,
        education: doctorData.education,
        experience: doctorData.experience,
        languages: doctorData.languages,
        rppsNumber: doctorData.rppsNumber,
        consultationPrice: doctorData.consultationPrice,
        rating: doctorData.rating,
        reviewCount: doctorData.reviewCount
      }).returning();
      
      // Generate time slots for this doctor
      const timeSlots = generateTimeSlots(doctor.id);
      
      // Insert time slots in batches
      for (const slot of timeSlots) {
        await db.insert(doctorTimeSlots).values(slot);
      }
      
      console.log(`✅ Created doctor: Dr. ${doctorData.firstName} ${doctorData.lastName} (${email} / password123)`);
    }
    
    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📋 Doctor login credentials:");
    console.log("Email: sarah.miller@doktu.com");
    console.log("Password: password123");
    console.log("\nAll doctors use the same password: password123");
    
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log("Seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}