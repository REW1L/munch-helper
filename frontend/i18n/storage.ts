import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupportedLanguage, type LanguageCode } from './languages';

// Dedicated storage key, independent of the user profile (`user`) so the language
// preference applies even before a profile exists. Mirrors the AsyncStorage
// pattern used by hooks/useUser.ts.
export const LANGUAGE_STORAGE_KEY = 'language';

export async function getStoredLanguage(): Promise<LanguageCode | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : null;
  } catch {
    // Storage is best-effort; fall through to detection/default on failure.
    return null;
  }
}

export async function setStoredLanguage(language: LanguageCode): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Swallow persistence failures — the in-memory language still applies for
    // the current session.
  }
}
