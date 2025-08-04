import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkAdmins() {
  try {
    const admins = await db.select().from(users).where(eq(users.role, 'admin'));
    console.log(`Found ${admins.length} admin users:`);
    admins.forEach(admin => {
      console.log(`- ${admin.email} (ID: ${admin.id}, Supabase ID: ${admin.supabaseId})`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdmins();
