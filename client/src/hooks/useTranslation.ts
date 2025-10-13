import { useTranslation as useI18nextTranslation } from 'react-i18next';
import type { TranslationNamespace } from '../i18n/types';

/**
 * Custom wrapper hook for react-i18next's useTranslation
 * Provides type-safe translation function with fallback handling
 *
 * @param ns - Namespace to use for translations (default: 'common')
 * @returns Translation function and i18n instance
 *
 * @example
 * ```tsx
 * const { t } = useTranslation('auth');
 * return <button>{t('auth.login.button')}</button>
 * ```
 */
export function useTranslation(ns: TranslationNamespace = 'common') {
  const { t, i18n, ready } = useI18nextTranslation(ns);

  // Custom translation function with fallback logging
  const translate = (key: string, defaultValue?: string, options?: any) => {
    const translation = t(key, defaultValue, options);

    // In development mode, log missing translations
    if (import.meta.env.DEV && translation === key && !defaultValue) {
      console.warn(`[i18n] Missing translation for key: ${key} in namespace: ${ns}`);
    }

    return translation;
  };

  return {
    t: translate,
    i18n,
    ready,
  };
}

export default useTranslation;
