import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const u = new URL(process.env.DATABASE_URL);
const sql = postgres({
  host: u.hostname,
  port: Number(u.port) || 5432,
  database: u.pathname.slice(1),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password || ''),
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

console.log('\n🔍 DoktuTracker - Complete Notification Implementation Audit');
console.log('═'.repeat(80));

// Complete notification catalog from Universal Notification System spec
const notificationCatalog = {
  'Account & Security': {
    'A1': { name: 'Registration Success', implemented: true, tested: true },
    'A2': { name: 'Email Verification', implemented: false, tested: false },
    'A3': { name: 'Password Reset', implemented: true, tested: true },
    'A4': { name: 'Password Changed', implemented: true, tested: true },
    'A5': { name: 'New Device/Session', implemented: false, tested: false },
    'A6': { name: 'MFA Updated', implemented: false, tested: false }
  },
  'Health Profile & Documents': {
    'H1': { name: 'Health Profile Incomplete', implemented: true, tested: true },
    'H2': { name: 'Health Profile Completed', implemented: false, tested: false },
    'H3': { name: 'Patient Uploads Document', implemented: false, tested: false },
    'H4': { name: 'Doctor Shares Document', implemented: false, tested: false },
    'H5': { name: 'Document Upload Failed', implemented: false, tested: false }
  },
  'Booking & Appointments': {
    'B1': { name: 'Payment Pending (15-min hold)', implemented: true, tested: true },
    'B2': { name: 'Hold Expired', implemented: false, tested: false },
    'B3': { name: 'Booking Confirmed', implemented: true, tested: true },
    'B4': { name: '24h Reminder', implemented: false, tested: false },
    'B5': { name: '1h Reminder', implemented: false, tested: false },
    'B6': { name: 'Live Imminent (≤5 min)', implemented: false, tested: false },
    'B7': { name: 'Rescheduled', implemented: false, tested: false },
    'B8': { name: 'Cancelled by Patient (Early)', implemented: false, tested: false },
    'B9': { name: 'Cancelled by Patient (Late)', implemented: false, tested: false },
    'B10': { name: 'Cancelled by Doctor', implemented: false, tested: false },
    'B11': { name: 'Doctor No-Show', implemented: false, tested: false },
    'B12': { name: 'Patient No-Show', implemented: false, tested: false }
  },
  'Membership & Payments': {
    'M1': { name: 'Membership Activated', implemented: false, tested: false },
    'M2': { name: 'Renewal Upcoming', implemented: false, tested: false },
    'M3': { name: 'Membership Renewed', implemented: false, tested: false },
    'M4': { name: 'Payment Failed (1st)', implemented: false, tested: false },
    'M5': { name: 'Membership Suspended', implemented: false, tested: false },
    'M6': { name: 'Cancelled by User', implemented: false, tested: false },
    'M7': { name: 'Reactivated', implemented: false, tested: false },
    'M8': { name: 'Allowance 1 Left', implemented: false, tested: false },
    'M9': { name: 'Allowance Exhausted', implemented: false, tested: false },
    'M10': { name: 'Monthly Reset', implemented: false, tested: false },
    'P1': { name: 'Pay-per-visit Receipt', implemented: false, tested: false },
    'P2': { name: 'Refund/Credit Issued', implemented: false, tested: false }
  },
  'Calendar & Availability': {
    'C1': { name: 'Availability Edited', implemented: false, tested: false },
    'C2': { name: 'Conflict Detected', implemented: false, tested: false },
    'C3': { name: 'External Calendar Connected', implemented: false, tested: false },
    'C4': { name: 'Calendar Sync Error', implemented: false, tested: false },
    'C5': { name: 'Timezone Change Detected', implemented: false, tested: false }
  },
  'Doctor Operations': {
    'D1': { name: 'New Booking (Doctor)', implemented: true, tested: true },
    'D2': { name: 'Daily Schedule Digest', implemented: false, tested: false },
    'D3': { name: 'Patient Document Upload', implemented: false, tested: false },
    'D4': { name: 'Low Utilization Nudge', implemented: false, tested: false }
  },
  'Admin & Support': {
    'X1': { name: 'High Payment Failure Rate', implemented: false, tested: false },
    'X2': { name: 'Doctor No-Show Rate High', implemented: false, tested: false },
    'X3': { name: 'Conversion Drop', implemented: false, tested: false },
    'X4': { name: 'Dispute/Chargeback', implemented: false, tested: false },
    'X5': { name: 'Security Event', implemented: false, tested: false }
  },
  'Growth & PLG': {
    'G1': { name: 'Onboarding Nudge (D+1)', implemented: false, tested: false },
    'G2': { name: 'Win-Back (30d inactive)', implemented: false, tested: false },
    'G3': { name: 'Post-Consultation Survey', implemented: false, tested: false },
    'G4': { name: 'Referral Ask (CSAT ≥8)', implemented: false, tested: false },
    'G5': { name: 'Membership Upsell', implemented: false, tested: false },
    'G6': { name: 'Review Request', implemented: false, tested: false }
  }
};

try {
  console.log('\n📊 STEP 1: Database Activity Analysis (Last 30 Days)');
  console.log('─'.repeat(80));

  // Check which trigger codes have EVER been used
  const usageStats = await sql`
    SELECT
      trigger_code,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      MIN(created_at) as first_use,
      MAX(created_at) as last_use,
      array_agg(DISTINCT template_key) FILTER (WHERE template_key IS NOT NULL) as templates_used
    FROM email_notifications
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY trigger_code
    ORDER BY MAX(created_at) DESC
  `;

  const usedTriggers = new Map();
  for (const stat of usageStats) {
    usedTriggers.set(stat.trigger_code, stat);
  }

  console.log(`Found ${usageStats.length} different notification types used in last 30 days:\n`);

  // Update catalog with real usage data
  for (const [category, triggers] of Object.entries(notificationCatalog)) {
    for (const [code, info] of Object.entries(triggers)) {
      const stats = usedTriggers.get(code);
      if (stats) {
        info.implemented = true;
        info.everUsed = true;
        info.totalSent = Number(stats.sent_count);
        info.totalFailed = Number(stats.failed_count);
        info.firstUse = stats.first_use;
        info.lastUse = stats.last_use;
        info.successRate = stats.total_count > 0
          ? ((stats.sent_count / stats.total_count) * 100).toFixed(1)
          : '0';
      }
    }
  }

  console.log('\n📈 STEP 2: Implementation Status by Category');
  console.log('═'.repeat(80));

  const summary = {
    total: 0,
    implemented: 0,
    working: 0,
    tested: 0,
    notImplemented: 0
  };

  for (const [category, triggers] of Object.entries(notificationCatalog)) {
    console.log(`\n${category}`);
    console.log('─'.repeat(80));

    let categoryImplemented = 0;
    let categoryWorking = 0;

    for (const [code, info] of Object.entries(triggers)) {
      summary.total++;

      let status = '⚪ NOT IMPLEMENTED';
      let details = '';

      if (info.everUsed) {
        summary.implemented++;
        categoryImplemented++;

        if (info.successRate >= 95) {
          status = '✅ WORKING';
          summary.working++;
          categoryWorking++;
          details = `${info.totalSent} sent (${info.successRate}% success)`;
        } else {
          status = '⚠️  HAS ISSUES';
          details = `${info.totalSent} sent, ${info.totalFailed} failed (${info.successRate}% success)`;
        }

        if (info.tested) {
          summary.tested++;
        }
      } else {
        summary.notImplemented++;
      }

      console.log(`${status} ${code} - ${info.name}`);
      if (details) {
        console.log(`      ${details}`);
        console.log(`      Last used: ${new Date(info.lastUse).toLocaleDateString()}`);
      }
    }

    console.log(`\n   Category Stats: ${categoryWorking}/${Object.keys(triggers).length} working, ${categoryImplemented}/${Object.keys(triggers).length} implemented`);
  }

  console.log('\n\n📊 STEP 3: Overall System Statistics');
  console.log('═'.repeat(80));

  console.log(`\n📈 Implementation Coverage:`);
  console.log(`   Total notification types in spec: ${summary.total}`);
  console.log(`   Implemented & used: ${summary.implemented} (${((summary.implemented/summary.total)*100).toFixed(1)}%)`);
  console.log(`   Working correctly (≥95% success): ${summary.working} (${((summary.working/summary.total)*100).toFixed(1)}%)`);
  console.log(`   Not yet implemented: ${summary.notImplemented} (${((summary.notImplemented/summary.total)*100).toFixed(1)}%)`);

  console.log(`\n✅ Verified Working Notifications (${summary.working}):`);
  for (const [category, triggers] of Object.entries(notificationCatalog)) {
    for (const [code, info] of Object.entries(triggers)) {
      if (info.everUsed && info.successRate >= 95) {
        console.log(`   ✅ ${code} - ${info.name} (${info.successRate}% success, ${info.totalSent} sent)`);
      }
    }
  }

  console.log(`\n⚠️  Notifications with Issues:`);
  let hasIssues = false;
  for (const [category, triggers] of Object.entries(notificationCatalog)) {
    for (const [code, info] of Object.entries(triggers)) {
      if (info.everUsed && info.successRate < 95) {
        hasIssues = true;
        console.log(`   ⚠️  ${code} - ${info.name} (${info.successRate}% success, ${info.totalFailed} failures)`);
      }
    }
  }
  if (!hasIssues) {
    console.log('   None! All implemented notifications are working correctly.');
  }

  console.log(`\n⚪ Not Yet Implemented (${summary.notImplemented}):`);
  const notImplementedList = [];
  for (const [category, triggers] of Object.entries(notificationCatalog)) {
    for (const [code, info] of Object.entries(triggers)) {
      if (!info.everUsed) {
        notImplementedList.push(`${code} - ${info.name}`);
      }
    }
  }

  // Group by priority
  console.log('\n   HIGH PRIORITY (User-Facing):');
  const highPriority = ['B4', 'B5', 'B6', 'B7', 'M1', 'M2', 'M3', 'H2', 'P1'];
  notImplementedList.forEach(item => {
    const code = item.split(' - ')[0];
    if (highPriority.includes(code)) {
      console.log(`      ${item}`);
    }
  });

  console.log('\n   MEDIUM PRIORITY (Enhancement):');
  const mediumPriority = ['B8', 'B9', 'B10', 'M4', 'M5', 'M6', 'M7', 'H3', 'H4', 'P2'];
  notImplementedList.forEach(item => {
    const code = item.split(' - ')[0];
    if (mediumPriority.includes(code)) {
      console.log(`      ${item}`);
    }
  });

  console.log('\n   LOW PRIORITY (Admin/Analytics):');
  notImplementedList.forEach(item => {
    const code = item.split(' - ')[0];
    if (!highPriority.includes(code) && !mediumPriority.includes(code)) {
      console.log(`      ${item}`);
    }
  });

  console.log('\n\n📋 STEP 4: Recent Notification Activity (Last 7 Days)');
  console.log('═'.repeat(80));

  const recentActivity = await sql`
    SELECT
      DATE(created_at) as date,
      trigger_code,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM email_notifications
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at), trigger_code
    ORDER BY DATE(created_at) DESC, count DESC
  `;

  const activityByDate = new Map();
  for (const activity of recentActivity) {
    const dateKey = activity.date.toISOString().split('T')[0];
    if (!activityByDate.has(dateKey)) {
      activityByDate.set(dateKey, []);
    }
    activityByDate.get(dateKey).push(activity);
  }

  for (const [date, activities] of activityByDate) {
    const totalForDay = activities.reduce((sum, a) => sum + Number(a.count), 0);
    const sentForDay = activities.reduce((sum, a) => sum + Number(a.sent), 0);
    const successRate = ((sentForDay / totalForDay) * 100).toFixed(1);

    console.log(`\n${date}: ${totalForDay} notifications (${successRate}% success)`);
    activities.forEach(act => {
      const rate = ((act.sent / act.count) * 100).toFixed(0);
      const icon = act.failed > 0 ? '⚠️' : '✅';
      console.log(`   ${icon} ${act.trigger_code}: ${act.count} total (${rate}% success)`);
    });
  }

  console.log('\n\n🎯 STEP 5: Deployment Readiness Assessment');
  console.log('═'.repeat(80));

  const deploymentScore = {
    critical: { implemented: 0, total: 7 }, // A1, A3, B3, M1, P1, H1, D1
    important: { implemented: 0, total: 15 }, // Time-based reminders, lifecycle events
    optional: { implemented: 0, total: summary.total - 22 }
  };

  // Critical notifications
  const critical = ['A1', 'A3', 'B3', 'M1', 'P1', 'H1', 'D1'];
  critical.forEach(code => {
    for (const triggers of Object.values(notificationCatalog)) {
      if (triggers[code]?.everUsed) {
        deploymentScore.critical.implemented++;
      }
    }
  });

  const criticalPercent = ((deploymentScore.critical.implemented / deploymentScore.critical.total) * 100).toFixed(0);

  console.log('\n🚦 Deployment Readiness:');
  console.log(`   Critical Paths: ${deploymentScore.critical.implemented}/${deploymentScore.critical.total} (${criticalPercent}%)`);
  console.log(`   Overall Coverage: ${summary.implemented}/${summary.total} (${((summary.implemented/summary.total)*100).toFixed(1)}%)`);
  console.log(`   Success Rate: ${summary.working}/${summary.implemented} working (${summary.working === summary.implemented ? '100' : ((summary.working/summary.implemented)*100).toFixed(1)}%)`);

  if (deploymentScore.critical.implemented >= 5) {
    console.log('\n✅ RECOMMENDATION: GO FOR DEPLOYMENT');
    console.log('   Core notification flows are implemented and working.');
    console.log('   Additional notifications can be added in future sprints.');
  } else {
    console.log('\n⚠️  RECOMMENDATION: REVIEW REQUIRED');
    console.log(`   Only ${deploymentScore.critical.implemented}/7 critical notifications implemented.`);
    console.log('   Consider implementing missing critical paths before deployment.');
  }

  // Generate markdown report
  const report = `# DoktuTracker Notification System - Implementation Audit

**Generated:** ${new Date().toLocaleString()}
**Database:** Production (${u.hostname})

## Executive Summary

- **Total Notification Types:** ${summary.total}
- **Implemented:** ${summary.implemented} (${((summary.implemented/summary.total)*100).toFixed(1)}%)
- **Working Correctly:** ${summary.working} (${((summary.working/summary.total)*100).toFixed(1)}%)
- **Not Implemented:** ${summary.notImplemented} (${((summary.notImplemented/summary.total)*100).toFixed(1)}%)

## Deployment Readiness: ${deploymentScore.critical.implemented >= 5 ? '✅ GO' : '⚠️ REVIEW'}

Critical notification paths: ${deploymentScore.critical.implemented}/${deploymentScore.critical.total} (${criticalPercent}%)

${deploymentScore.critical.implemented >= 5
  ? '✅ Core flows operational. System ready for production.'
  : '⚠️ Missing critical notifications. Review required.'
}

## Detailed Breakdown

${Object.entries(notificationCatalog).map(([category, triggers]) => {
  const implemented = Object.values(triggers).filter(t => t.everUsed).length;
  const working = Object.values(triggers).filter(t => t.everUsed && t.successRate >= 95).length;

  return `### ${category}

**Status:** ${working}/${Object.keys(triggers).length} working, ${implemented}/${Object.keys(triggers).length} implemented

${Object.entries(triggers).map(([code, info]) => {
  if (info.everUsed) {
    const icon = info.successRate >= 95 ? '✅' : '⚠️';
    return `- ${icon} **${code}** - ${info.name}\n  - ${info.totalSent} sent (${info.successRate}% success)\n  - Last used: ${new Date(info.lastUse).toLocaleDateString()}`;
  } else {
    return `- ⚪ **${code}** - ${info.name} (Not implemented)`;
  }
}).join('\n')}
`;
}).join('\n\n')}

## Next Steps

### High Priority (User-Facing)
${notImplementedList.filter(item => highPriority.includes(item.split(' - ')[0])).map(item => `- ${item}`).join('\n')}

### Medium Priority (Enhancement)
${notImplementedList.filter(item => mediumPriority.includes(item.split(' - ')[0])).map(item => `- ${item}`).join('\n')}

### Low Priority (Admin/Analytics)
${notImplementedList.filter(item => {
  const code = item.split(' - ')[0];
  return !highPriority.includes(code) && !mediumPriority.includes(code);
}).map(item => `- ${item}`).join('\n')}
`;

  fs.writeFileSync('C:\\Users\\mings\\DOKTU_NOTIFICATION_IMPLEMENTATION_AUDIT.md', report);
  console.log('\n\n📄 Detailed report saved to: C:\\Users\\mings\\DOKTU_NOTIFICATION_IMPLEMENTATION_AUDIT.md');

} catch (error) {
  console.error('\n❌ Error:', error);
} finally {
  await sql.end();
}
