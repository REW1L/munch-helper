import { getLocales } from 'expo-localization';

import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  type LanguageCode,
} from './languages';

function primarySubtag(tag: string | null | undefined): string | null {
  if (!tag) {
    return null;
  }
  return tag.replace('_', '-').split('-')[0]?.toLowerCase() ?? null;
}

// Inspect the device's preferred locales (most-preferred first) and return the
// first one whose primary language subtag is supported, defaulting to English
// when none of them match the supported set.
export function detectDeviceLanguage(): LanguageCode {
  let locales: { languageTag?: string | null; languageCode?: string | null }[] = [];
  try {
    locales = getLocales();
  } catch {
    return DEFAULT_LANGUAGE;
  }

  for (const locale of locales) {
    const subtag = primarySubtag(locale.languageCode ?? locale.languageTag);
    if (isSupportedLanguage(subtag)) {
      return subtag;
    }
  }

  return DEFAULT_LANGUAGE;
}
