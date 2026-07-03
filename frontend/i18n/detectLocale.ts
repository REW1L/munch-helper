import { NativeModules, Platform } from 'react-native';

import { normalizeLocale, SupportedLocale } from '@/i18n/locales';

type SettingsManager = {
  settings?: {
    AppleLocale?: string;
    AppleLanguages?: string[];
  };
};

type I18nManager = {
  localeIdentifier?: string;
};

function getNavigatorLanguage(): string | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const languages = 'languages' in navigator && Array.isArray(navigator.languages)
    ? navigator.languages
    : [];
  return languages[0] || navigator.language || null;
}

function getNativeLanguage(): string | null {
  const settingsManager = NativeModules.SettingsManager as SettingsManager | undefined;
  const i18nManager = NativeModules.I18nManager as I18nManager | undefined;
  return (
    settingsManager?.settings?.AppleLocale ||
    settingsManager?.settings?.AppleLanguages?.[0] ||
    i18nManager?.localeIdentifier ||
    null
  );
}

export function detectDeviceLocale(): SupportedLocale | null {
  const detected = Platform.OS === 'web' ? getNavigatorLanguage() : getNativeLanguage();
  return normalizeLocale(detected);
}
