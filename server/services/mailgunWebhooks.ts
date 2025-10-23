import crypto from 'crypto';
import { supabase } from '../supabaseAuth';

/**
 * Mailgun Webhook Handler Service
 * Processes email events (delivered, opened, clicked, bounced, etc.)
 * and stores them in the database for analytics
 */

interface MailgunWebhookEvent {
  signature: {
    timestamp: string;
    token: string;
    signature: string;
  };
  'event-data': {
    event: 'delivered' | 'opened' | 'clicked' | 'failed' | 'complained' | 'unsubscribed';
    timestamp: number;
    id: string; // Mailgun message ID
    recipient: string;
    message?: {
      headers: {
        'message-id': string;
        subject?: string;
      };
    };
    // Click event specific
    url?: string;
    'client-info'?: {
      'user-agent'?: string;
      'client-type'?: string;
      'client-os'?: string;
      'device-type'?: string;
      'client-name'?: string;
    };
    'geo-location'?: {
      country?: string;
      city?: string;
    };
    ip?: string;
    // Bounce event specific
    'delivery-status'?: {
      'bounce-type'?: 'hard' | 'soft' | 'temporary';
      code?: number;
      description?: string;
      message?: string;
    };
    tags?: string[];
    'user-variables'?: {
      notification_id?: string;
      [key: string]: any;
    };
  };
}

/**
 * Verify Mailgun webhook signature
 * Prevents spoofed webhook requests
 */
export function verifyMailgunSignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

  if (!signingKey) {
    console.warn('⚠️  MAILGUN_WEBHOOK_SIGNING_KEY not set - signature verification disabled');
    return true; // Allow in development
  }

  const encodedData = `${timestamp}${token}`;
  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(encodedData);
  const computedSignature = hmac.digest('hex');

  return computedSignature === signature;
}

/**
 * Extract notification ID from Mailgun tags or custom variables
 */
function extractNotificationId(eventData: any): string | null {
  // Try user-variables first (recommended method)
  if (eventData['user-variables']?.notification_id) {
    return eventData['user-variables'].notification_id;
  }

  // Try tags as fallback
  if (eventData.tags && Array.isArray(eventData.tags)) {
    const notifTag = eventData.tags.find((tag: string) => tag.startsWith('notif_'));
    if (notifTag) {
      return notifTag.replace('notif_', '');
    }
  }

  // Try extracting from message-id header
  if (eventData.message?.headers?.['message-id']) {
    const messageId = eventData.message.headers['message-id'];
    // Format: <notification_id@doktu.co>
    const match = messageId.match(/<([^@]+)@/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Process a single Mailgun webhook event
 */
export async function processMailgunEvent(webhookData: MailgunWebhookEvent): Promise<void> {
  const { signature, 'event-data': eventData } = webhookData;

  // Verify signature
  if (!verifyMailgunSignature(signature.timestamp, signature.token, signature.signature)) {
    throw new Error('Invalid Mailgun webhook signature');
  }

  // Extract notification ID
  const notificationId = extractNotificationId(eventData);
  if (!notificationId) {
    console.warn(`⚠️  Could not extract notification_id from event:`, eventData.event, eventData.recipient);
    // Still process the event, but we won't link it to a notification
  }

  // Map Mailgun event types to our schema
  const eventType = mapMailgunEventType(eventData.event);

  // Prepare event data
  const eventRecord = {
    notification_id: notificationId,
    event_type: eventType,
    mailgun_id: eventData.id,
    recipient_email: eventData.recipient,
    event_timestamp: new Date(eventData.timestamp * 1000).toISOString(),

    // Click/Open tracking
    url: eventData.url || null,
    user_agent: eventData['client-info']?.['user-agent'] || null,
    ip_address: eventData.ip || null,
    country: eventData['geo-location']?.country || null,
    city: eventData['geo-location']?.city || null,
    device_type: eventData['client-info']?.['device-type'] || null,

    // Bounce/Failure data
    bounce_type: eventData['delivery-status']?.['bounce-type'] || null,
    error_code: eventData['delivery-status']?.code?.toString() || null,
    error_description:
      eventData['delivery-status']?.description ||
      eventData['delivery-status']?.message ||
      null,

    // Raw event for debugging
    raw_event: eventData,
  };

  // Insert event into database
  const { error: insertError } = await supabase
    .from('email_events')
    .insert(eventRecord);

  if (insertError) {
    console.error('❌ Failed to insert email event:', insertError);
    throw insertError;
  }

  console.log(`✅ Processed ${eventType} event for ${eventData.recipient}`, notificationId ? `(notification: ${notificationId})` : '');

  // Update notification status if linked
  if (notificationId && eventType === 'delivered') {
    await supabase
      .from('email_notifications')
      .update({
        status: 'sent',
        sent_at: new Date(eventData.timestamp * 1000).toISOString(),
        metadata: {
          mailgun_id: eventData.id,
          delivered_at: new Date(eventData.timestamp * 1000).toISOString(),
        },
      })
      .eq('id', notificationId);
  }

  // Calculate engagement score after event processing
  if (notificationId && ['opened', 'clicked'].includes(eventType)) {
    await calculateEngagementScore(notificationId);
  }
}

/**
 * Map Mailgun event types to our schema
 */
function mapMailgunEventType(mailgunEvent: string): string {
  const mapping: Record<string, string> = {
    delivered: 'delivered',
    opened: 'opened',
    clicked: 'clicked',
    failed: 'failed',
    bounced: 'bounced',
    complained: 'complained',
    unsubscribed: 'unsubscribed',
    permanent_fail: 'bounced',
    temporary_fail: 'failed',
  };

  return mapping[mailgunEvent] || mailgunEvent;
}

/**
 * Calculate engagement score for a notification
 */
async function calculateEngagementScore(notificationId: string): Promise<void> {
  try {
    // Call the PostgreSQL function
    await supabase.rpc('calculate_engagement_score', {
      p_notification_id: notificationId,
    });
  } catch (error) {
    console.error('Error calculating engagement score:', error);
  }
}

/**
 * Refresh template performance stats
 * Should be called periodically (e.g., daily via cron)
 */
export async function refreshTemplatePerformance(): Promise<void> {
  try {
    await supabase.rpc('refresh_template_performance');
    console.log('✅ Template performance stats refreshed');
  } catch (error) {
    console.error('❌ Failed to refresh template performance:', error);
    throw error;
  }
}

/**
 * Get analytics summary for a specific notification
 */
export async function getNotificationAnalytics(notificationId: string): Promise<any> {
  const { data, error } = await supabase
    .from('email_analytics_summary')
    .select('*')
    .eq('notification_id', notificationId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found
    console.error('Error fetching analytics:', error);
    return null;
  }

  return data;
}

/**
 * Get template performance stats
 */
export async function getTemplatePerformance(
  templateKey?: string
): Promise<any> {
  let query = supabase
    .from('template_performance')
    .select('*')
    .order('total_sent', { ascending: false });

  if (templateKey) {
    query = query.eq('template_key', templateKey);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching template performance:', error);
    return [];
  }

  return data;
}

/**
 * Get email events for a notification
 */
export async function getNotificationEvents(
  notificationId: string,
  eventType?: string
): Promise<any[]> {
  let query = supabase
    .from('email_events')
    .select('*')
    .eq('notification_id', notificationId)
    .order('event_timestamp', { ascending: false });

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return data || [];
}

/**
 * Get analytics dashboard data
 */
export async function getAnalyticsDashboard(
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const end = endDate || new Date();

  // Get overall stats
  const { data: events } = await supabase
    .from('email_events')
    .select('event_type, event_timestamp')
    .gte('event_timestamp', start.toISOString())
    .lte('event_timestamp', end.toISOString());

  // Aggregate by day
  const dailyStats: Record<string, any> = {};
  events?.forEach((event) => {
    const day = event.event_timestamp.split('T')[0];
    if (!dailyStats[day]) {
      dailyStats[day] = {
        date: day,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
      };
    }
    dailyStats[day][event.event_type] = (dailyStats[day][event.event_type] || 0) + 1;
  });

  return {
    daily_stats: Object.values(dailyStats).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    ),
    total_events: events?.length || 0,
  };
}
