import { afterEach, describe, expect, it } from 'vitest';

import i18n from '..';

describe('missing translation fallback', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('falls back to the English value when a key is missing in the active language', async () => {
    // Inject a key that only exists in English, then activate a language that lacks it.
    i18n.addResource('en', 'translation', 'testOnly.fallbackProbe', 'English fallback');
    await i18n.changeLanguage('ru');

    expect(i18n.t('testOnly.fallbackProbe' as never)).toBe('English fallback');
  });

  it('returns the key itself when it is absent from every catalog', async () => {
    await i18n.changeLanguage('en');
    const key = 'totally.missing.key';

    expect(i18n.t(key as never)).toBe(key);
  });

  it('interpolates values into the active-language string', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('roomCreate.title', { game: 'Munchkin' })).toBe(
      'Einen Raum für Munchkin erstellen?'
    );
  });
});
