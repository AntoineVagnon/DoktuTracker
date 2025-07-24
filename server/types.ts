import 'express-session';
import type { Session } from '@supabase/supabase-js';

declare module 'express-session' {
  interface SessionData {
    supabaseSession?: Session;
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string;
    }
  }
}