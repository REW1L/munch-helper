// Central definition of the languages the app ships with. `en` is the
// source-of-truth catalog and the runtime fallback; every other language mirrors
// its key set (enforced by TypeScript `satisfies` in each locale file and by the
// runtime parity test).

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'pl', name: 'Polski' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'lt', name: 'Lietuvių' },
  { code: 'lv', name: 'Latviešu' },
  { code: 'et', name: 'Eesti' },
  { code: 'ru', name: 'Русский' },
  { code: 'be', name: 'Беларуская' },
  { code: 'uk', name: 'Українська' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const SUPPORTED_LANGUAGE_CODES: readonly LanguageCode[] =
  SUPPORTED_LANGUAGES.map((language) => language.code);

export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return (
    typeof value === 'string' &&
    SUPPORTED_LANGUAGE_CODES.includes(value as LanguageCode)
  );
}

// Reduce an arbitrary BCP-47 tag (e.g. `de-AT`, `ru_RU`) to a supported language
// by its primary subtag, falling back to the default when unsupported.
export function resolveSupportedLanguage(
  tag: string | null | undefined
): LanguageCode {
  if (!tag) {
    return DEFAULT_LANGUAGE;
  }

  const primarySubtag = tag.replace('_', '-').split('-')[0]?.toLowerCase();
  if (isSupportedLanguage(primarySubtag)) {
    return primarySubtag;
  }

  return DEFAULT_LANGUAGE;
}
