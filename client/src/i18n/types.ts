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
  | 'errors'
  | 'support'
  | 'contact'
  | 'terms_of_service'
  | 'privacy_policy'
  | 'gdpr'
  | 'medical_disclaimer';

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
      support: typeof import('../locales/en/support.json');
      contact: typeof import('../locales/en/contact.json');
      terms_of_service: typeof import('../locales/en/terms_of_service.json');
      privacy_policy: typeof import('../locales/en/privacy_policy.json');
      gdpr: typeof import('../locales/en/gdpr.json');
      medical_disclaimer: typeof import('../locales/en/medical_disclaimer.json');
    };
  }
}
