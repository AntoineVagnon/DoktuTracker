/**
 * Language Detection Utility for DokTu
 * Detects user's preferred language from browser settings
 * Supports: English (en) and Bosnian (bs)
 */

export type SupportedLocale = 'en' | 'bs';

/**
 * Detect user's preferred language from browser
 * @returns 'en' or 'bs'
 */
export function detectBrowserLanguage(): SupportedLocale {
  try {
    // Try to get language from navigator
    const browserLang = navigator.language || (navigator as any).userLanguage;

    if (browserLang) {
      // Bosnian variants (bs, bs-BA, bs-Latn-BA)
      if (browserLang.toLowerCase().startsWith('bs')) {
        console.log('🌍 Detected browser language: Bosnian (bs)');
        return 'bs';
      }
    }

    // Default to English for all other languages
    console.log('🌍 Detected browser language: English (en) - default');
    return 'en';
  } catch (error) {
    console.warn('⚠️ Failed to detect browser language:', error);
    return 'en'; // Safe fallback
  }
}

/**
 * Get supported locale from any language string
 * @param lang - Language code (e.g., 'bs-BA', 'en-US', 'de-DE')
 * @returns 'en' or 'bs'
 */
export function getSupportedLocale(lang: string | null | undefined): SupportedLocale {
  if (!lang) return 'en';

  const normalizedLang = lang.toLowerCase().trim();

  // Bosnian variants
  if (normalizedLang.startsWith('bs')) {
    return 'bs';
  }

  // Default to English for unsupported languages
  return 'en';
}

/**
 * Get language name in native form
 * @param locale - 'en' or 'bs'
 * @returns Language name in its native form
 */
export function getLanguageName(locale: SupportedLocale): string {
  const names: Record<SupportedLocale, string> = {
    en: 'English',
    bs: 'Bosanski'
  };
  return names[locale] || names.en;
}

/**
 * Validate if a string is a supported locale
 * @param locale - String to validate
 * @returns true if locale is 'en' or 'bs'
 */
export function isSupportedLocale(locale: any): locale is SupportedLocale {
  return locale === 'en' || locale === 'bs';
}
