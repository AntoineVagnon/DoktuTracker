import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not set in environment variables');
    console.error('Please set DATABASE_URL in your .env file');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', 'add-doctor-documents.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Running doctor documents migration...');

    // Execute the migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Created:');
    console.log('  - doctor_documents table');
    console.log('  - Indexes for efficient queries');
    console.log('  - documents_uploaded_at column in doctors table');
    console.log('');
    console.log('Note: license_number and license_expiration_date columns are marked as DEPRECATED');
    console.log('      but kept for backward compatibility. They can be dropped in a future migration.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('Details:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration();
