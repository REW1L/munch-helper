import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupportedLocale, SupportedLocale } from '@/i18n/locales';

export const LANGUAGE_STORAGE_KEY = 'language';

export async function loadStoredLocale(): Promise<SupportedLocale | null> {
  const storedLocale = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isSupportedLocale(storedLocale) ? storedLocale : null;
}

export async function saveStoredLocale(locale: SupportedLocale): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
}
