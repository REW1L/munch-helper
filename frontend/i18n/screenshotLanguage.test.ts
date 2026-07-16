import { afterEach, describe, expect, it } from 'vitest';

import { getScreenshotLanguageOverride } from './screenshotLanguage';

const originalValue = process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE;

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE;
  } else {
    process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE = originalValue;
  }
});

describe('getScreenshotLanguageOverride', () => {
  it('uses a configured supported screenshot language', () => {
    process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE = 'uk';
    expect(getScreenshotLanguageOverride()).toBe('uk');
  });

  it('ignores an absent or unsupported screenshot language', () => {
    delete process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE;
    expect(getScreenshotLanguageOverride()).toBeNull();
    process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE = 'not-a-locale';
    expect(getScreenshotLanguageOverride()).toBeNull();
  });
});
