// Analytics tracking service for user behavior and conversion funnel

interface AnalyticsEvent {
  eventType: string;
  eventData?: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  userId?: number;
}

class AnalyticsService {
  private sessionId: string;
  private userId: number | null = null;
  private events: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Generate or retrieve session ID
    this.sessionId = this.getOrCreateSessionId();
    
    // Start periodic flush
    this.startPeriodicFlush();
    
    // Flush events on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  private getOrCreateSessionId(): string {
    const stored = sessionStorage.getItem('analytics_session_id');
    if (stored) return stored;
    
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', newId);
    return newId;
  }

  private startPeriodicFlush() {
    // Flush events every 30 seconds
    this.flushInterval = setInterval(() => this.flush(), 30000);
  }

  setUserId(userId: number | null) {
    this.userId = userId;
  }

  // Track page views
  trackPageView(page: string, referrer?: string) {
    this.track('page_view', {
      page,
      referrer: referrer || document.referrer,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  }

  // Track discovery stage interactions
  trackDiscovery(action: string, details?: Record<string, any>) {
    this.track('discovery', {
      action,
      ...details
    });
  }

  // Track booking funnel progress
  trackBookingFunnel(stage: string, doctorId?: number, details?: Record<string, any>) {
    this.track('booking_funnel', {
      stage,
      doctorId,
      ...details
    });
  }

  // Track conversion events
  trackConversion(type: string, value?: number, details?: Record<string, any>) {
    this.track('conversion', {
      type,
      value,
      ...details
    });
  }

  // Generic event tracking
  track(eventType: string, eventData?: Record<string, any>) {
    const event: AnalyticsEvent = {
      eventType,
      eventData,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    this.events.push(event);
    
    // Flush if we have too many events
    if (this.events.length >= 20) {
      this.flush();
    }
  }

  // Send events to backend
  async flush() {
    if (this.events.length === 0) return;
    
    const eventsToSend = [...this.events];
    this.events = [];
    
    try {
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ events: eventsToSend })
      });
      
      if (!response.ok) {
        throw new Error(`Analytics failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-add events if send failed
      this.events = [...eventsToSend, ...this.events];
    }
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();