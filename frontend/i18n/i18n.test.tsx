import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LocalizationProvider, useLocalization } from '@/i18n/LocalizationContext';
import { detectDeviceLocale } from '@/i18n/detectLocale';
import {
  LOCALE_INFOS,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from '@/i18n/locales';
import { LANGUAGE_STORAGE_KEY, loadStoredLocale, saveStoredLocale } from '@/i18n/storage';
import { interpolate, translate } from '@/i18n/translate';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock('react-native', () => ({
  NativeModules: {
    SettingsManager: {
      settings: {
        AppleLanguages: ['fr-CA'],
      },
    },
  },
  Platform: {
    OS: 'ios',
  },
}));

const mockedAsyncStorage = vi.mocked(AsyncStorage);

describe('i18n locale metadata', () => {
  it('lists every first-launch supported language', () => {
    expect(SUPPORTED_LOCALES).toEqual([
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
    ]);
    expect(LOCALE_INFOS.map((locale) => locale.englishName)).toEqual([
      'English',
      'Polish',
      'German',
      'French',
      'Lithuanian',
      'Latvian',
      'Estonian',
      'Russian',
      'Belarusian',
      'Ukrainian',
    ]);
  });

  it('normalizes full locale tags to supported base languages', () => {
    expect(normalizeLocale('fr-CA')).toBe('fr');
    expect(normalizeLocale('LT_lt')).toBe('lt');
    expect(normalizeLocale('es-MX')).toBeNull();
  });

  it('detects the native device locale through the local helper', () => {
    expect(detectDeviceLocale()).toBe('fr');
  });
});

describe('i18n translation lookup', () => {
  it('interpolates dynamic values', () => {
    expect(interpolate('Room {{roomCode}} for {{name}}', { roomCode: 'ROOM42', name: 'Alice' }))
      .toBe('Room ROOM42 for Alice');
  });

  it('falls back to English for missing locale keys', () => {
    expect(translate('pl', 'common.save')).toBe('Zapisz');
    expect(translate('pl', 'common.done')).toBe('Done');
  });

  it('interpolates localized strings', () => {
    expect(translate('de', 'user.defaultName', { postfix: 'AAAAAA' })).toBe('Spieler AAAAAA');
  });
});

describe('i18n storage', () => {
  it('loads a supported stored locale', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('uk');

    await expect(loadStoredLocale()).resolves.toBe('uk');
    expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY);
  });

  it('ignores unsupported stored locales', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('es');

    await expect(loadStoredLocale()).resolves.toBeNull();
  });

  it('saves the selected locale locally', async () => {
    mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);

    await saveStoredLocale('lt');

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'lt');
  });
});

function LocaleConsumer() {
  const { locale, setLocale, t } = useLocalization();

  return (
    <div>
      <p data-testid="locale">{locale}</p>
      <p data-testid="language-label">{t('settings.language')}</p>
      <button type="button" onClick={() => { void setLocale('lt'); }}>Set Lithuanian</button>
    </div>
  );
}

describe('LocalizationProvider', () => {
  it('loads a saved locale and applies manual language changes', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('fr');
    mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);

    render(
      <LocalizationProvider>
        <LocaleConsumer />
      </LocalizationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('fr');
    });
    expect(screen.getByTestId('language-label').textContent).toBe('Langue');

    await act(async () => {
      fireEvent.click(screen.getByText('Set Lithuanian'));
    });

    expect(screen.getByTestId('locale').textContent).toBe('lt');
    expect(screen.getByTestId('language-label').textContent).toBe('Kalba');
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'lt');
  });
});
