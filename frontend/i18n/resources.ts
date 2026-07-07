import type { LanguageCode } from './languages';
import be from './locales/be';
import bg from './locales/bg';
import cs from './locales/cs';
import da from './locales/da';
import de from './locales/de';
import el from './locales/el';
import en, { type TranslationResource } from './locales/en';
import es from './locales/es';
import et from './locales/et';
import fi from './locales/fi';
import fr from './locales/fr';
import ga from './locales/ga';
import hr from './locales/hr';
import hu from './locales/hu';
import it from './locales/it';
import lt from './locales/lt';
import lv from './locales/lv';
import mt from './locales/mt';
import nl from './locales/nl';
import pl from './locales/pl';
import pt from './locales/pt';
import ro from './locales/ro';
import ru from './locales/ru';
import sk from './locales/sk';
import sl from './locales/sl';
import sv from './locales/sv';
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
  es: { translation: es },
  it: { translation: it },
  pt: { translation: pt },
  nl: { translation: nl },
  el: { translation: el },
  cs: { translation: cs },
  sk: { translation: sk },
  hu: { translation: hu },
  ro: { translation: ro },
  bg: { translation: bg },
  hr: { translation: hr },
  sl: { translation: sl },
  da: { translation: da },
  sv: { translation: sv },
  fi: { translation: fi },
  ga: { translation: ga },
  mt: { translation: mt },
};
