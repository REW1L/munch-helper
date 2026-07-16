import { isSupportedLanguage, type LanguageCode } from './languages';

/**
 * Release screenshot builds inject this public Expo variable at bundle time.
 * It is deliberately ignored for normal app builds, where it is absent.
 */
export function getScreenshotLanguageOverride(): LanguageCode | null {
  const configured = process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE?.trim();
  return isSupportedLanguage(configured) ? configured : null;
}
