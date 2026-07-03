import { beforeEach, describe, expect, it, vi } from 'vitest';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getStoredLanguage, LANGUAGE_STORAGE_KEY, setStoredLanguage } from '../storage';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

const mockStorage = vi.mocked(AsyncStorage);

describe('language storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a stored supported language', async () => {
    mockStorage.getItem.mockResolvedValue('ru');
    await expect(getStoredLanguage()).resolves.toBe('ru');
    expect(mockStorage.getItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY);
  });

  it('ignores an unsupported stored value', async () => {
    mockStorage.getItem.mockResolvedValue('ja');
    await expect(getStoredLanguage()).resolves.toBeNull();
  });

  it('returns null when nothing is stored', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    await expect(getStoredLanguage()).resolves.toBeNull();
  });

  it('returns null and swallows storage read errors', async () => {
    mockStorage.getItem.mockRejectedValue(new Error('boom'));
    await expect(getStoredLanguage()).resolves.toBeNull();
  });

  it('persists the selected language under the dedicated key', async () => {
    mockStorage.setItem.mockResolvedValue();
    await setStoredLanguage('pl');
    expect(mockStorage.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'pl');
  });
});
