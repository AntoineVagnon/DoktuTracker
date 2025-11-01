import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n');

    // Check doctor_documents table
    const tableCheck = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'doctor_documents'
      ORDER BY ordinal_position;
    `);

    console.log('✅ doctor_documents table columns:');
    if (tableCheck.rows.length === 0) {
      console.log('❌ Table does not exist!');
    } else {
      console.table(tableCheck.rows);
    }

    // Check indexes
    const indexCheck = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'doctor_documents';
    `);

    console.log('\n✅ doctor_documents indexes:');
    console.table(indexCheck.rows);

    // Check doctors table license fields
    const doctorsCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'doctors'
      AND column_name IN ('license_number', 'license_expiration_date', 'rpps_number');
    `);

    console.log('\n✅ doctors table license fields (should be nullable):');
    console.table(doctorsCheck.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
