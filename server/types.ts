
import 'express-session';
import type { Session } from '@supabase/supabase-js';

declare module 'express-session' {
  interface SessionData {
    supabaseSession?: Session;
    bookingRedirect?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}
