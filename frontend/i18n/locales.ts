export const DEFAULT_LOCALE = 'en';

export const SUPPORTED_LOCALES = [
  'en',
  'pl',
  'de',
  'fr',
  'lt',
  'lv',
  'et',
  'ru',
  'be',
  'uk',
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export type LocaleInfo = {
  code: SupportedLocale;
  englishName: string;
  nativeName: string;
};

export const LOCALE_INFOS: LocaleInfo[] = [
  { code: 'en', englishName: 'English', nativeName: 'English' },
  { code: 'pl', englishName: 'Polish', nativeName: 'Polski' },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch' },
  { code: 'fr', englishName: 'French', nativeName: 'Français' },
  { code: 'lt', englishName: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'lv', englishName: 'Latvian', nativeName: 'Latviešu' },
  { code: 'et', englishName: 'Estonian', nativeName: 'Eesti' },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский' },
  { code: 'be', englishName: 'Belarusian', nativeName: 'Беларуская' },
  { code: 'uk', englishName: 'Ukrainian', nativeName: 'Українська' },
];

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return typeof value === 'string' && SUPPORTED_LOCALE_SET.has(value);
}

export function normalizeLocale(value: string | null | undefined): SupportedLocale | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace('_', '-');
  if (!normalized) {
    return null;
  }

  const exact = normalized.split('.')[0];
  if (isSupportedLocale(exact)) {
    return exact;
  }

  const [language] = exact.split('-');
  return isSupportedLocale(language) ? language : null;
}
