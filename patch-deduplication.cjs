// Patch script to fix deduplication logic in notificationService.ts
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'services', 'notificationService.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the deduplication function
const searchString = `  private async checkDuplicateNotification(userId: number, appointmentId: number | undefined, triggerCode: TriggerCode): Promise<boolean> {
    const thirtyMinutesAgo = subMinutes(new Date(), 30);

    // Check notification queue for duplicate notifications
    const [existing] = await db
      .select({
        id: notificationQueue.id
      })
      .from(notificationQueue)
      .where(and(
        eq(notificationQueue.userId, userId),
        eq(notificationQueue.triggerCode, triggerCode),
        gte(notificationQueue.createdAt, thirtyMinutesAgo),
        eq(notificationQueue.status, 'pending')
      ));

    return !!existing;
  }`;

const replacementString = `  private async checkDuplicateNotification(userId: number, appointmentId: number | undefined, triggerCode: TriggerCode): Promise<boolean> {
    const thirtyMinutesAgo = subMinutes(new Date(), 30);

    // Check notification queue for duplicate notifications
    // Include both 'pending' and 'failed' to prevent creating duplicates
    // while failed notifications are being retried
    const [existing] = await db
      .select({
        id: notificationQueue.id,
        status: notificationQueue.status
      })
      .from(notificationQueue)
      .where(and(
        eq(notificationQueue.userId, userId),
        eq(notificationQueue.triggerCode, triggerCode),
        gte(notificationQueue.createdAt, thirtyMinutesAgo),
        or(
          eq(notificationQueue.status, 'pending'),
          eq(notificationQueue.status, 'failed')
        )
      ));

    if (existing) {
      console.log(\`🔁 Found existing \${existing.status} notification within 30 minutes - preventing duplicate\`);
    }

    return !!existing;
  }`;

if (content.includes(searchString)) {
  content = content.replace(searchString, replacementString);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully patched notificationService.ts with improved deduplication logic');
  console.log('   - Now includes both pending and failed status in duplicate check');
  console.log('   - Prevents creating duplicates while failed notifications are being retried');
  process.exit(0);
} else {
  console.error('❌ Could not find target string in file. File may have already been patched or structure changed.');
  process.exit(1);
}
