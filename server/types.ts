
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
        id: number; // Changed from string to number to match database schema
        email?: string;
        firstName?: string;
        lastName?: string;
        stripeSubscriptionId?: string;
        stripeCustomerId?: string;
        pendingSubscriptionPlan?: string;
        role?: string;
      };
    }
  }
}
