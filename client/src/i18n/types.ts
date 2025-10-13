// TypeScript types for i18next
import 'react-i18next';

// Define available namespaces
export type TranslationNamespace =
  | 'common'
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'doctors'
  | 'booking'
  | 'errors';

// Extend i18next module for type safety
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof import('../locales/en/common.json');
      landing: typeof import('../locales/en/landing.json');
      auth: typeof import('../locales/en/auth.json');
      dashboard: typeof import('../locales/en/dashboard.json');
      doctors: typeof import('../locales/en/doctors.json');
      booking: typeof import('../locales/en/booking.json');
      errors: typeof import('../locales/en/errors.json');
    };
  }
}
