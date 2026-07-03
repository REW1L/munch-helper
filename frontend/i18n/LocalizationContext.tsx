import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { detectDeviceLocale } from '@/i18n/detectLocale';
import {
  DEFAULT_LOCALE,
  LOCALE_INFOS,
  LocaleInfo,
  SupportedLocale,
} from '@/i18n/locales';
import { loadStoredLocale, saveStoredLocale } from '@/i18n/storage';
import { translate, TranslationKey, TranslationValues } from '@/i18n/translate';

type LocalizationContextValue = {
  locale: SupportedLocale;
  localeOptions: LocaleInfo[];
  setLocale: (locale: SupportedLocale) => Promise<void>;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const defaultContextValue: LocalizationContextValue = {
  locale: DEFAULT_LOCALE,
  localeOptions: LOCALE_INFOS,
  setLocale: async () => undefined,
  t: (key, values) => translate(DEFAULT_LOCALE, key, values),
};

const LocalizationContext = createContext<LocalizationContextValue>(defaultContextValue);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    let mounted = true;

    const loadLocale = async () => {
      try {
        const storedLocale = await loadStoredLocale();
        const nextLocale = storedLocale || detectDeviceLocale() || DEFAULT_LOCALE;
        if (mounted) {
          setLocaleState(nextLocale);
        }
      } catch {
        if (mounted) {
          setLocaleState(DEFAULT_LOCALE);
        }
      }
    };

    loadLocale();

    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = useCallback(async (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    await saveStoredLocale(nextLocale);
  }, []);

  const value = useMemo<LocalizationContextValue>(
    () => ({
      locale,
      localeOptions: LOCALE_INFOS,
      setLocale,
      t: (key, values) => translate(locale, key, values),
    }),
    [locale, setLocale]
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationContextValue {
  return React.useContext(LocalizationContext);
}
