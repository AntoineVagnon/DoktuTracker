import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function createReviewsTable() {
  try {
    console.log('Creating reviews table...');
    
    // Create the reviews table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id INTEGER REFERENCES appointments(id) NOT NULL,
        patient_id INTEGER REFERENCES users(id) NOT NULL,
        doctor_id INTEGER REFERENCES doctors(id) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Reviews table created successfully');
    
    // Create indexes for better performance
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reviews_appointment_id ON reviews(appointment_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reviews_doctor_id ON reviews(doctor_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_reviews_patient_id ON reviews(patient_id)`);
    
    console.log('✅ Indexes created successfully');
    
  } catch (error) {
    console.error('Error creating reviews table:', error);
  }
  
  process.exit(0);
}

createReviewsTable();