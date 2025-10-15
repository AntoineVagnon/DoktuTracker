import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enLanding from '../locales/en/landing.json';
import enAuth from '../locales/en/auth.json';
import enDashboard from '../locales/en/dashboard.json';
import enDoctors from '../locales/en/doctors.json';
import enBooking from '../locales/en/booking.json';
import enErrors from '../locales/en/errors.json';
import enSupport from '../locales/en/support.json';

import bsCommon from '../locales/bs/common.json';
import bsLanding from '../locales/bs/landing.json';
import bsAuth from '../locales/bs/auth.json';
import bsDashboard from '../locales/bs/dashboard.json';
import bsDoctors from '../locales/bs/doctors.json';
import bsBooking from '../locales/bs/booking.json';
import bsErrors from '../locales/bs/errors.json';
import bsSupport from '../locales/bs/support.json';

// Initialize i18next
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    // Resources: translation files organized by language and namespace
    resources: {
      en: {
        common: enCommon,
        landing: enLanding,
        auth: enAuth,
        dashboard: enDashboard,
        doctors: enDoctors,
        booking: enBooking,
        errors: enErrors,
        support: enSupport,
      },
      bs: {
        common: bsCommon,
        landing: bsLanding,
        auth: bsAuth,
        dashboard: bsDashboard,
        doctors: bsDoctors,
        booking: bsBooking,
        errors: bsErrors,
        support: bsSupport,
      },
    },
    // Default language
    fallbackLng: 'bs',
    // Default namespace
    defaultNS: 'common',
    // Namespaces to load
    ns: ['common', 'landing', 'auth', 'dashboard', 'doctors', 'booking', 'errors', 'support'],

    // Language detection options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'querystring', 'navigator'],
      // Keys or params to lookup language from
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'doktu-language',
      // Cache user language
      caches: ['localStorage'],
    },

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Development mode (shows console warnings for missing translations)
    debug: import.meta.env.DEV,

    // React options
    react: {
      useSuspense: true, // Enable suspense mode
    },
  });

export default i18n;
