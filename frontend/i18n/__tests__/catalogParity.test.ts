import { describe, expect, it } from 'vitest';

import { SUPPORTED_LANGUAGE_CODES } from '../languages';
import { resources } from '../resources';
import en from '../locales/en';

// Recursively collect dotted key paths (e.g. `rooms.create`) from a catalog.
function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      return collectKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

const englishKeys = collectKeys(en).sort();

describe('catalog parity', () => {
  const nonEnglish = SUPPORTED_LANGUAGE_CODES.filter((code) => code !== 'en');

  it('English catalog exposes keys', () => {
    expect(englishKeys.length).toBeGreaterThan(0);
  });

  it.each(nonEnglish)('%s catalog has exactly the English key set', (code) => {
    const catalog = resources[code].translation as Record<string, unknown>;
    const keys = collectKeys(catalog).sort();

    const missing = englishKeys.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !englishKeys.includes(key));

    expect(missing, `missing keys in ${code}`).toEqual([]);
    expect(extra, `extra keys in ${code}`).toEqual([]);
  });

  it.each(nonEnglish)('%s catalog has no empty values', (code) => {
    const catalog = resources[code].translation as Record<string, unknown>;
    const emptyKeys = collectKeys(catalog).filter((path) => {
      const value = path
        .split('.')
        .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], catalog);
      return typeof value !== 'string' || value.trim().length === 0;
    });

    expect(emptyKeys, `empty values in ${code}`).toEqual([]);
  });
});
