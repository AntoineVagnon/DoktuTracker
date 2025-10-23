/**
 * i18n Service for Email Templates
 * Supports English (en) and Bosnian (bs)
 */

import enTranslations from '../locales/en.json';
import bsTranslations from '../locales/bs.json';

type Locale = 'en' | 'bs';

interface Translations {
  [key: string]: any;
}

const translations: Record<Locale, Translations> = {
  en: enTranslations,
  bs: bsTranslations,
};

/**
 * Get translated string by key path
 * @param locale User's language preference
 * @param keyPath Dot-notation path to translation (e.g., "account.registration.subject")
 * @param variables Optional variables for interpolation
 * @returns Translated string with interpolated variables
 */
export function t(locale: Locale | string, keyPath: string, variables?: Record<string, any>): string {
  // Fallback to English if locale not supported
  const safeLocale = (locale === 'en' || locale === 'bs') ? locale : 'en';

  // Navigate the nested translation object
  const keys = keyPath.split('.');
  let value: any = translations[safeLocale];

  for (const key of keys) {
    if (value === undefined || value === null) {
      console.warn(`Translation key not found: ${keyPath} for locale: ${safeLocale}`);
      // Fallback to English
      value = translations.en;
      for (const k of keys) {
        value = value?.[k];
      }
      break;
    }
    value = value[key];
  }

  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string: ${keyPath}`);
    return keyPath; // Return key path as fallback
  }

  // Interpolate variables
  if (variables) {
    return interpolate(value, variables);
  }

  return value;
}

/**
 * Interpolate variables into translation string
 * Supports {{variableName}} syntax
 */
function interpolate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

/**
 * Get all translations for a specific template
 * @param locale User's language preference
 * @param templateKey Template identifier (e.g., "account.registration")
 * @returns All translation strings for the template
 */
export function getTemplateTranslations(locale: Locale | string, templateKey: string): any {
  const safeLocale = (locale === 'en' || locale === 'bs') ? locale : 'en';

  const keys = templateKey.split('.');
  let value: any = translations[safeLocale];

  for (const key of keys) {
    value = value?.[key];
  }

  return value || translations.en;
}

/**
 * Check if locale is supported
 */
export function isSupportedLocale(locale: string): locale is Locale {
  return locale === 'en' || locale === 'bs';
}

/**
 * Get user's locale or fallback to default
 */
export function getUserLocale(userLocale?: string | null): Locale {
  if (userLocale && isSupportedLocale(userLocale)) {
    return userLocale;
  }
  return 'en';
}
