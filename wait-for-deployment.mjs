/**
 * Monitor Railway deployment completion
 * Checks health endpoint every 10 seconds until deployment completes
 */

const PRODUCTION_URL = 'https://web-production-b2ce.up.railway.app';
const CHECK_INTERVAL = 10000; // 10 seconds
const MAX_WAIT = 5 * 60 * 1000; // 5 minutes

console.log('\n🚀 Monitoring Railway Deployment');
console.log('═'.repeat(80));
console.log(`URL: ${PRODUCTION_URL}`);
console.log(`Started: ${new Date().toISOString()}`);
console.log('═'.repeat(80));

let lastStatus = null;
let deploymentDetected = false;
let startTime = Date.now();

async function checkHealth() {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/health`, {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      return { status: 'healthy', data };
    } else {
      return { status: 'unhealthy', code: response.status };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { status: 'timeout' };
    }
    return { status: 'error', message: error.message };
  }
}

async function monitor() {
  const check = await checkHealth();
  const now = new Date().toISOString();
  const elapsed = Math.round((Date.now() - startTime) / 1000);

  if (check.status === 'healthy' && lastStatus !== 'healthy') {
    if (deploymentDetected) {
      // API came back up after being down - deployment completed!
      console.log(`\n[${now}] (${elapsed}s) ✅ DEPLOYMENT COMPLETE!`);
      console.log(`API Version: ${check.data.version || 'unknown'}`);
      console.log('═'.repeat(80));
      console.log('\n🎯 Next Step: Create a new test booking to verify the fix!');
      console.log('\n   The fix should now be deployed. Please:');
      console.log('   1. Go to https://web-production-b2ce.up.railway.app');
      console.log('   2. Create a NEW booking');
      console.log('   3. Check if you receive the email\n');
      return true;
    } else {
      console.log(`[${now}] (${elapsed}s) ✅ API is healthy (waiting for deployment to start...)`);
    }
  } else if (check.status === 'healthy') {
    console.log(`[${now}] (${elapsed}s) ⏳ API healthy, waiting for deployment...`);
  } else if (check.status === 'unhealthy' || check.status === 'timeout' || check.status === 'error') {
    if (!deploymentDetected) {
      console.log(`[${now}] (${elapsed}s) 🔄 DEPLOYMENT STARTED - API is ${check.status}`);
      deploymentDetected = true;
    } else {
      console.log(`[${now}] (${elapsed}s) 🔄 Deploying... (${check.status})`);
    }
  }

  lastStatus = check.status;

  // Check if we've exceeded max wait time
  if (Date.now() - startTime > MAX_WAIT) {
    console.log(`\n[${now}] ⚠️  Max wait time exceeded (5 minutes)`);
    console.log('Please check Railway dashboard manually.');
    return true;
  }

  return false;
}

// Initial check
console.log('\n📍 Initial Status Check...\n');
await monitor();

// Set up monitoring interval
const intervalId = setInterval(async () => {
  const done = await monitor();
  if (done) {
    clearInterval(intervalId);
    process.exit(0);
  }
}, CHECK_INTERVAL);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Monitoring stopped by user');
  clearInterval(intervalId);
  process.exit(0);
});
