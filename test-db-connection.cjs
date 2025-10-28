// Test Database Connection
const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  // Display masked connection string
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  // Parse and display connection details (masked)
  try {
    const url = new URL(dbUrl);
    console.log('📧 Connection details:');
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port || '5432'}`);
    console.log(`   Database: ${url.pathname.substring(1)}`);
    console.log(`   User: ${url.username}`);
    console.log(`   Password: ${url.password ? '***' + url.password.slice(-4) : 'not set'}`);
    console.log(`   SSL: ${url.searchParams.get('sslmode') || 'require'}\n`);
  } catch (error) {
    console.error('❌ Invalid DATABASE_URL format:', error.message);
    process.exit(1);
  }

  // Test 1: Basic connection with IPv4 preference
  console.log('📡 Test 1: Basic connection with IPv4 preference...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    // Force IPv4 to avoid IPv6 DNS issues
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 5432
  });

  try {
    await client.connect();
    console.log('✅ Connection successful!\n');

    // Test query
    console.log('📊 Running test query...');
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Query successful!');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(',')[0]}\n`);

    await client.end();
    console.log('✅ Database connection test passed!');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error details:', error);

    // Provide troubleshooting tips
    console.log('\n💡 Troubleshooting tips:');

    if (error.code === 'ENOTFOUND') {
      console.log('   • DNS resolution failed - check your internet connection');
      console.log('   • Try flushing DNS cache: ipconfig /flushdns');
      console.log('   • Check if you can access other websites');
      console.log('   • Try using a different DNS server (Google: 8.8.8.8)');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('   • Check if Supabase is experiencing downtime');
      console.log('   • Verify your firewall isn\'t blocking port 5432');
      console.log('   • Check if you\'re behind a corporate proxy/VPN');
    } else if (error.code === '28P01') {
      console.log('   • Invalid database credentials');
      console.log('   • Check your DATABASE_URL in .env file');
    }

    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignore
    }
  }
}

testConnection();
