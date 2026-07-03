import i18n from './index';
import { DEFAULT_LANGUAGE, type LanguageCode } from './languages';

// Map the active i18next language to a BCP-47 locale for Intl. The language codes
// we use are already valid BCP-47 primary subtags, so this is mostly a typed
// pass-through with an English fallback for anything unexpected.
function activeLocale(): LanguageCode {
  const current = i18n.language as LanguageCode | undefined;
  return current ?? DEFAULT_LANGUAGE;
}

function withFallback<T>(compute: (locale: string) => T, fallback: (locale: string) => T): T {
  const locale = activeLocale();
  try {
    return compute(locale);
  } catch {
    // Locale data may be unavailable for some tags on certain JS engines
    // (e.g. Hermes builds). Fall back to English formatting rather than crash.
    return fallback(DEFAULT_LANGUAGE);
  }
}

// Locale-aware date/time formatting tied to the active language.
export function formatDateTime(
  date: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  return withFallback(
    (locale) => new Intl.DateTimeFormat(locale, options).format(date),
    (locale) => new Intl.DateTimeFormat(locale, options).format(date)
  );
}

// Locale-aware number formatting tied to the active language.
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return withFallback(
    (locale) => new Intl.NumberFormat(locale, options).format(value),
    (locale) => new Intl.NumberFormat(locale, options).format(value)
  );
}
