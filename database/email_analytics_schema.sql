-- Email Analytics Schema for Mailgun Webhook Integration
-- Tracks email delivery, opens, clicks, bounces, and complaints

-- Email Events Table (stores all Mailgun webhook events)
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES email_notifications(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'complained'

  -- Mailgun Event Data
  mailgun_id VARCHAR(255), -- Mailgun message ID
  recipient_email VARCHAR(255),
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Click/Open Tracking
  url VARCHAR(1000), -- For 'clicked' events
  user_agent TEXT, -- Browser/device info
  ip_address VARCHAR(45), -- IPv4 or IPv6
  country VARCHAR(100),
  city VARCHAR(100),
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'

  -- Bounce/Failure Data
  bounce_type VARCHAR(50), -- 'hard', 'soft', 'temporary'
  error_code VARCHAR(50),
  error_description TEXT,

  -- Raw webhook data (for debugging)
  raw_event JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT email_events_event_type_check CHECK (
    event_type IN ('delivered', 'opened', 'clicked', 'bounced', 'failed', 'complained', 'unsubscribed')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_events_notification_id ON email_events(notification_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_recipient ON email_events(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_events_mailgun_id ON email_events(mailgun_id);

-- Email Analytics Summary Table (aggregated stats per notification)
CREATE TABLE IF NOT EXISTS email_analytics_summary (
  notification_id UUID PRIMARY KEY REFERENCES email_notifications(id) ON DELETE CASCADE,

  -- Delivery Metrics
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_time_seconds INTEGER, -- Time from sent to delivered

  -- Engagement Metrics
  opened_at TIMESTAMP WITH TIME ZONE,
  first_open_time_seconds INTEGER, -- Time from delivered to first open
  total_opens INTEGER DEFAULT 0,
  unique_opens INTEGER DEFAULT 0,

  clicked_at TIMESTAMP WITH TIME ZONE,
  first_click_time_seconds INTEGER, -- Time from delivered to first click
  total_clicks INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,

  -- Failure Metrics
  bounced_at TIMESTAMP WITH TIME ZONE,
  bounce_type VARCHAR(50),
  bounce_reason TEXT,

  complained_at TIMESTAMP WITH TIME ZONE, -- User marked as spam
  unsubscribed_at TIMESTAMP WITH TIME ZONE,

  -- Calculated Metrics
  engagement_score DECIMAL(5,2), -- 0-100 score based on opens/clicks

  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT email_analytics_bounce_type_check CHECK (
    bounce_type IN ('hard', 'soft', 'temporary', NULL)
  )
);

-- Template Performance Table (aggregated stats per template)
CREATE TABLE IF NOT EXISTS template_performance (
  template_key VARCHAR(100) PRIMARY KEY,
  trigger_code VARCHAR(10),

  -- Volume Metrics
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,

  -- Engagement Metrics
  total_opened INTEGER DEFAULT 0,
  unique_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  unique_clicked INTEGER DEFAULT 0,

  -- Rate Metrics (percentages)
  delivery_rate DECIMAL(5,2), -- delivered / sent
  open_rate DECIMAL(5,2), -- unique_opened / delivered
  click_rate DECIMAL(5,2), -- unique_clicked / delivered
  click_to_open_rate DECIMAL(5,2), -- unique_clicked / unique_opened
  bounce_rate DECIMAL(5,2), -- bounced / sent
  complaint_rate DECIMAL(5,2), -- complaints / delivered

  -- Average Timing
  avg_delivery_time_seconds INTEGER,
  avg_first_open_time_seconds INTEGER,
  avg_first_click_time_seconds INTEGER,

  -- Quality Score
  template_quality_score DECIMAL(5,2), -- 0-100 based on all metrics

  -- Last Updated
  last_sent_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for updating email_analytics_summary when events are added
CREATE OR REPLACE FUNCTION update_email_analytics_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update summary record
  INSERT INTO email_analytics_summary (notification_id)
  VALUES (NEW.notification_id)
  ON CONFLICT (notification_id) DO NOTHING;

  -- Update based on event type
  CASE NEW.event_type
    WHEN 'delivered' THEN
      UPDATE email_analytics_summary
      SET delivered_at = NEW.event_timestamp,
          updated_at = NOW()
      WHERE notification_id = NEW.notification_id;

    WHEN 'opened' THEN
      UPDATE email_analytics_summary
      SET total_opens = total_opens + 1,
          opened_at = COALESCE(opened_at, NEW.event_timestamp),
          first_open_time_seconds = CASE
            WHEN opened_at IS NULL AND delivered_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (NEW.event_timestamp - delivered_at))::INTEGER
            ELSE first_open_time_seconds
          END,
          updated_at = NOW()
      WHERE notification_id = NEW.notification_id;

    WHEN 'clicked' THEN
      UPDATE email_analytics_summary
      SET total_clicks = total_clicks + 1,
          clicked_at = COALESCE(clicked_at, NEW.event_timestamp),
          first_click_time_seconds = CASE
            WHEN clicked_at IS NULL AND delivered_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (NEW.event_timestamp - delivered_at))::INTEGER
            ELSE first_click_time_seconds
          END,
          updated_at = NOW()
      WHERE notification_id = NEW.notification_id;

    WHEN 'bounced' THEN
      UPDATE email_analytics_summary
      SET bounced_at = NEW.event_timestamp,
          bounce_type = NEW.bounce_type,
          bounce_reason = NEW.error_description,
          updated_at = NOW()
      WHERE notification_id = NEW.notification_id;

    WHEN 'complained' THEN
      UPDATE email_analytics_summary
      SET complained_at = NEW.event_timestamp,
          updated_at = NOW()
      WHERE notification_id = NEW.notification_id;

    WHEN 'unsubscribed' THEN
      UPDATE email_analytics_summary
      SET unsubscribed_at = NEW.event_timestamp,
          updated_at = NOW()
      WHERE notification_id = NEW.notification_id;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_analytics_summary
  AFTER INSERT ON email_events
  FOR EACH ROW
  EXECUTE FUNCTION update_email_analytics_summary();

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_notification_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL(5,2) := 0;
  v_summary RECORD;
BEGIN
  SELECT * INTO v_summary
  FROM email_analytics_summary
  WHERE notification_id = p_notification_id;

  IF v_summary IS NULL THEN
    RETURN 0;
  END IF;

  -- Delivered: 20 points
  IF v_summary.delivered_at IS NOT NULL THEN
    v_score := v_score + 20;
  END IF;

  -- Opened: 40 points
  IF v_summary.opened_at IS NOT NULL THEN
    v_score := v_score + 40;
  END IF;

  -- Clicked: 40 points
  IF v_summary.clicked_at IS NOT NULL THEN
    v_score := v_score + 40;
  END IF;

  -- Penalties
  IF v_summary.bounced_at IS NOT NULL THEN
    v_score := v_score - 50;
  END IF;

  IF v_summary.complained_at IS NOT NULL THEN
    v_score := v_score - 30;
  END IF;

  -- Ensure score is between 0 and 100
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Update the summary
  UPDATE email_analytics_summary
  SET engagement_score = v_score
  WHERE notification_id = p_notification_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh template performance stats
CREATE OR REPLACE FUNCTION refresh_template_performance()
RETURNS void AS $$
BEGIN
  INSERT INTO template_performance (
    template_key,
    trigger_code,
    total_sent,
    total_delivered,
    total_bounced,
    total_failed,
    total_opened,
    unique_opened,
    total_clicked,
    unique_clicked,
    delivery_rate,
    open_rate,
    click_rate,
    bounce_rate,
    last_sent_at,
    updated_at
  )
  SELECT
    n.template_key,
    n.trigger_code,
    COUNT(n.id) as total_sent,
    COUNT(CASE WHEN s.delivered_at IS NOT NULL THEN 1 END) as total_delivered,
    COUNT(CASE WHEN s.bounced_at IS NOT NULL THEN 1 END) as total_bounced,
    COUNT(CASE WHEN n.status = 'failed' THEN 1 END) as total_failed,
    SUM(COALESCE(s.total_opens, 0)) as total_opened,
    COUNT(CASE WHEN s.opened_at IS NOT NULL THEN 1 END) as unique_opened,
    SUM(COALESCE(s.total_clicks, 0)) as total_clicked,
    COUNT(CASE WHEN s.clicked_at IS NOT NULL THEN 1 END) as unique_clicked,
    ROUND(
      COUNT(CASE WHEN s.delivered_at IS NOT NULL THEN 1 END)::DECIMAL /
      NULLIF(COUNT(n.id), 0) * 100,
      2
    ) as delivery_rate,
    ROUND(
      COUNT(CASE WHEN s.opened_at IS NOT NULL THEN 1 END)::DECIMAL /
      NULLIF(COUNT(CASE WHEN s.delivered_at IS NOT NULL THEN 1 END), 0) * 100,
      2
    ) as open_rate,
    ROUND(
      COUNT(CASE WHEN s.clicked_at IS NOT NULL THEN 1 END)::DECIMAL /
      NULLIF(COUNT(CASE WHEN s.delivered_at IS NOT NULL THEN 1 END), 0) * 100,
      2
    ) as click_rate,
    ROUND(
      COUNT(CASE WHEN s.bounced_at IS NOT NULL THEN 1 END)::DECIMAL /
      NULLIF(COUNT(n.id), 0) * 100,
      2
    ) as bounce_rate,
    MAX(n.sent_at) as last_sent_at,
    NOW() as updated_at
  FROM email_notifications n
  LEFT JOIN email_analytics_summary s ON n.id = s.notification_id
  WHERE n.status IN ('sent', 'failed')
  GROUP BY n.template_key, n.trigger_code
  ON CONFLICT (template_key) DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_delivered = EXCLUDED.total_delivered,
    total_bounced = EXCLUDED.total_bounced,
    total_failed = EXCLUDED.total_failed,
    total_opened = EXCLUDED.total_opened,
    unique_opened = EXCLUDED.unique_opened,
    total_clicked = EXCLUDED.total_clicked,
    unique_clicked = EXCLUDED.unique_clicked,
    delivery_rate = EXCLUDED.delivery_rate,
    open_rate = EXCLUDED.open_rate,
    click_rate = EXCLUDED.click_rate,
    bounce_rate = EXCLUDED.bounce_rate,
    last_sent_at = EXCLUDED.last_sent_at,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE email_events IS 'Stores all email events from Mailgun webhooks (delivered, opened, clicked, bounced, etc.)';
COMMENT ON TABLE email_analytics_summary IS 'Aggregated analytics for each email notification';
COMMENT ON TABLE template_performance IS 'Performance metrics aggregated by template';
COMMENT ON FUNCTION update_email_analytics_summary() IS 'Trigger function that updates analytics summary when new events arrive';
COMMENT ON FUNCTION calculate_engagement_score(UUID) IS 'Calculates 0-100 engagement score based on delivery, opens, and clicks';
COMMENT ON FUNCTION refresh_template_performance() IS 'Recalculates all template performance metrics from current data';
