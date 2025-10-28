import https from 'https';

console.log('\n🔍 Checking Production Deployment Version\n');
console.log('='.repeat(80));

const options = {
  hostname: 'web-production-b2ce.up.railway.app',
  port: 443,
  path: '/',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    // Look for the version info in the HTML
    const versionMatch = data.match(/Build number: (\d{8}-\d{4})/);
    const dateMatch = data.match(/App version: ([0-9T:Z-]+)/);

    console.log('\n📦 Current Production Build Info:');

    if (versionMatch) {
      console.log(`   Build Number: ${versionMatch[1]}`);
    } else {
      console.log('   Build Number: Not found in HTML');
    }

    if (dateMatch) {
      console.log(`   App Version: ${dateMatch[1]}`);
    } else {
      console.log('   App Version: Not found in HTML');
    }

    const today = new Date();
    const expectedDate = today.toISOString().split('T')[0].replace(/-/g, '');

    console.log(`\n🎯 Expected Build Date: ${expectedDate.slice(0,4)}-${expectedDate.slice(4,6)}-${expectedDate.slice(6,8)}`);

    if (versionMatch && versionMatch[1].startsWith(expectedDate)) {
      console.log('\n✅ Deployment is CURRENT (today\'s build)');
    } else {
      console.log('\n⏳ Deployment is NOT current yet (waiting for Railway)');
      console.log('   Try again in 2-3 minutes');
    }

    console.log('\n' + '='.repeat(80));
  });
});

req.on('error', (error) => {
  console.error('❌ Error checking deployment:', error.message);
});

req.end();
