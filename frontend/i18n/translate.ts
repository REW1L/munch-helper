import { en, Messages } from '@/i18n/en';
import { SupportedLocale } from '@/i18n/locales';
import { translations } from '@/i18n/translations';

type LeafPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? LeafPaths<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

export type TranslationKey = LeafPaths<Messages>;
export type TranslationValues = Record<string, string | number>;

function readPath(source: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, source);

  return typeof value === 'string' ? value : undefined;
}

export function interpolate(template: string, values: TranslationValues = {}): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  ));
}

export function translate(locale: SupportedLocale, key: TranslationKey, values?: TranslationValues): string {
  const localized = readPath(translations[locale], key);
  const fallback = readPath(en, key);
  return interpolate(localized || fallback || key, values);
}
