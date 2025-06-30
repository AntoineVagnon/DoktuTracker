import { seedDatabase } from './server/seed.ts';

async function runSeed() {
  try {
    await seedDatabase();
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

runSeed();