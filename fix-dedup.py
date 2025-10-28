#!/usr/bin/env python3
"""Fix deduplication logic in notificationService.ts"""

import re

# Read the file
with open('server/services/notificationService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find the checkDuplicateNotification function
old_pattern = r'''(private async checkDuplicateNotification\(userId: number, appointmentId: number \| undefined, triggerCode: TriggerCode\): Promise<boolean> \{
    const thirtyMinutesAgo = subMinutes\(new Date\(\), 30\);

    // Check notification queue for duplicate notifications
    const \[existing\] = await db
      \.select\(\{
        id: notificationQueue\.id
      \}\)
      \.from\(notificationQueue\)
      \.where\(and\(
        eq\(notificationQueue\.userId, userId\),
        eq\(notificationQueue\.triggerCode, triggerCode\),
        gte\(notificationQueue\.createdAt, thirtyMinutesAgo\),
        eq\(notificationQueue\.status, 'pending'\)
      \)\)\;

    return !!existing;
  \})'''

new_code = '''private async checkDuplicateNotification(userId: number, appointmentId: number | undefined, triggerCode: TriggerCode): Promise<boolean> {
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
      console.log(`🔁 Found existing ${existing.status} notification within 30 minutes - preventing duplicate`);
    }

    return !!existing;
  }'''

# Replace the function
new_content = re.sub(old_pattern, new_code, content, flags=re.MULTILINE)

if new_content != content:
    # Write back
    with open('server/services/notificationService.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('✅ Successfully fixed deduplication logic')
    print('   - Now includes both pending and failed status in duplicate check')
    print('   - Prevents creating duplicates while failed notifications are being retried')
    print('   - Added logging to track when duplicates are prevented')
else:
    print('❌ No changes made - pattern not found or already patched')
