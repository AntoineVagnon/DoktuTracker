
import 'express-session';
import type { Session } from '@supabase/supabase-js';

declare module 'express-session' {
  interface SessionData {
    supabaseSession?: Session;
    bookingRedirect?: string;
    heldSlots?: Record<string, {
      slotId: string;
      expiresAt: Date;
      heldAt: Date;
    }>;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        stripeSubscriptionId?: string;
        stripeCustomerId?: string;
        pendingSubscriptionPlan?: string;
      };
    }
  }
}
