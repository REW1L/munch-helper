import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLocales } from 'expo-localization';

import { detectDeviceLanguage } from '../detectLanguage';

vi.mock('expo-localization', () => ({
  getLocales: vi.fn(),
}));

const mockGetLocales = vi.mocked(getLocales);

describe('detectDeviceLanguage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('matches a supported language by its primary subtag', () => {
    mockGetLocales.mockReturnValue([
      { languageCode: 'de', languageTag: 'de-AT' },
    ] as unknown as ReturnType<typeof getLocales>);

    expect(detectDeviceLanguage()).toBe('de');
  });

  it('reduces a region tag (de-AT) to the supported base language', () => {
    mockGetLocales.mockReturnValue([
      { languageCode: null, languageTag: 'de-AT' },
    ] as unknown as ReturnType<typeof getLocales>);

    expect(detectDeviceLanguage()).toBe('de');
  });

  it('returns the first supported language across preferences', () => {
    mockGetLocales.mockReturnValue([
      { languageCode: 'ja', languageTag: 'ja-JP' },
      { languageCode: 'uk', languageTag: 'uk-UA' },
    ] as unknown as ReturnType<typeof getLocales>);

    expect(detectDeviceLanguage()).toBe('uk');
  });

  it('falls back to English when no locale is supported', () => {
    mockGetLocales.mockReturnValue([
      { languageCode: 'ja', languageTag: 'ja-JP' },
    ] as unknown as ReturnType<typeof getLocales>);

    expect(detectDeviceLanguage()).toBe('en');
  });

  it('falls back to English when locale lookup throws', () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error('unavailable');
    });

    expect(detectDeviceLanguage()).toBe('en');
  });
});
