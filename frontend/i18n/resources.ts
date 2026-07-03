import type { LanguageCode } from './languages';
import be from './locales/be';
import de from './locales/de';
import en, { type TranslationResource } from './locales/en';
import et from './locales/et';
import fr from './locales/fr';
import lt from './locales/lt';
import lv from './locales/lv';
import pl from './locales/pl';
import ru from './locales/ru';
import uk from './locales/uk';

export const DEFAULT_NAMESPACE = 'translation';

// i18next resource bundle keyed by language code. Every catalog is bundled up
// front (the catalogs are small); lazy-loading can be revisited later if bundle
// size becomes a concern.
export const resources: Record<LanguageCode, { [DEFAULT_NAMESPACE]: TranslationResource }> = {
  en: { translation: en },
  pl: { translation: pl },
  de: { translation: de },
  fr: { translation: fr },
  lt: { translation: lt },
  lv: { translation: lv },
  et: { translation: et },
  ru: { translation: ru },
  be: { translation: be },
  uk: { translation: uk },
};
