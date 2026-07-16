import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LanguageProvider } from '@/components/LanguageProvider';
import i18n from '@/i18n';
import { detectDeviceLanguage } from '@/i18n/detectLanguage';
import { getStoredLanguage, setStoredLanguage } from '@/i18n/storage';

vi.mock('@/i18n/detectLanguage', () => ({
  detectDeviceLanguage: vi.fn(),
}));

vi.mock('@/i18n/storage', () => ({
  getStoredLanguage: vi.fn(),
  setStoredLanguage: vi.fn(),
}));

const mockGetStored = vi.mocked(getStoredLanguage);
const mockDetect = vi.mocked(detectDeviceLanguage);
const mockSetStored = vi.mocked(setStoredLanguage);

describe('LanguageProvider', () => {
  const originalScreenshotLanguage = process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE;

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE;
    mockSetStored.mockResolvedValue();
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    if (originalScreenshotLanguage === undefined) {
      delete process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE;
    } else {
      process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE = originalScreenshotLanguage;
    }
    await i18n.changeLanguage('en');
  });

  it('applies a saved preference over the detected device locale', async () => {
    mockGetStored.mockResolvedValue('ru');
    mockDetect.mockReturnValue('de');

    render(
      <LanguageProvider>
        <span>ready</span>
      </LanguageProvider>
    );

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
    expect(i18n.language).toBe('ru');
    expect(mockDetect).not.toHaveBeenCalled();
  });

  it('falls back to device detection when nothing is saved', async () => {
    mockGetStored.mockResolvedValue(null);
    mockDetect.mockReturnValue('pl');

    render(
      <LanguageProvider>
        <span>ready</span>
      </LanguageProvider>
    );

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
    expect(i18n.language).toBe('pl');
  });

  it('gates children until the language resolves', async () => {
    let resolveStored: (value: null) => void = () => {};
    mockGetStored.mockReturnValue(
      new Promise<null>((resolve) => {
        resolveStored = resolve;
      })
    );
    mockDetect.mockReturnValue('en');

    render(
      <LanguageProvider>
        <span>ready</span>
      </LanguageProvider>
    );

    expect(screen.queryByText('ready')).toBeNull();
    resolveStored(null);
    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
  });

  it('uses screenshot language instead of stored or device language', async () => {
    process.env.EXPO_PUBLIC_SCREENSHOT_LANGUAGE = 'uk';
    mockGetStored.mockResolvedValue('ru');
    mockDetect.mockReturnValue('de');

    render(
      <LanguageProvider>
        <span>ready</span>
      </LanguageProvider>
    );

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
    expect(i18n.language).toBe('uk');
    expect(mockGetStored).not.toHaveBeenCalled();
    expect(mockDetect).not.toHaveBeenCalled();
  });

});
