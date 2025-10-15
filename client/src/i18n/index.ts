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
import enContact from '../locales/en/contact.json';
import enTermsOfService from '../locales/en/terms_of_service.json';
import enPrivacyPolicy from '../locales/en/privacy_policy.json';
import enGdpr from '../locales/en/gdpr.json';
import enMedicalDisclaimer from '../locales/en/medical_disclaimer.json';

import bsCommon from '../locales/bs/common.json';
import bsLanding from '../locales/bs/landing.json';
import bsAuth from '../locales/bs/auth.json';
import bsDashboard from '../locales/bs/dashboard.json';
import bsDoctors from '../locales/bs/doctors.json';
import bsBooking from '../locales/bs/booking.json';
import bsErrors from '../locales/bs/errors.json';
import bsSupport from '../locales/bs/support.json';
import bsContact from '../locales/bs/contact.json';
import bsTermsOfService from '../locales/bs/terms_of_service.json';
import bsPrivacyPolicy from '../locales/bs/privacy_policy.json';
import bsGdpr from '../locales/bs/gdpr.json';
import bsMedicalDisclaimer from '../locales/bs/medical_disclaimer.json';

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
        contact: enContact,
        terms_of_service: enTermsOfService,
        privacy_policy: enPrivacyPolicy,
        gdpr: enGdpr,
        medical_disclaimer: enMedicalDisclaimer,
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
        contact: bsContact,
        terms_of_service: bsTermsOfService,
        privacy_policy: bsPrivacyPolicy,
        gdpr: bsGdpr,
        medical_disclaimer: bsMedicalDisclaimer,
      },
    },
    // Default language
    fallbackLng: 'bs',
    // Default namespace
    defaultNS: 'common',
    // Namespaces to load
    ns: ['common', 'landing', 'auth', 'dashboard', 'doctors', 'booking', 'errors', 'support', 'contact', 'terms_of_service', 'privacy_policy', 'gdpr', 'medical_disclaimer'],

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
