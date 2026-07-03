import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { LanguageContext } from '@/context/LanguageContext';
import i18n from '@/i18n';
import { detectDeviceLanguage } from '@/i18n/detectLanguage';
import { DEFAULT_LANGUAGE, type LanguageCode } from '@/i18n/languages';
import { getStoredLanguage, setStoredLanguage } from '@/i18n/storage';

interface LanguageProviderProps {
  children: React.ReactNode;
}

/**
 * Resolves the active language on mount using the precedence
 * saved preference → device locale → English, activates it in i18next, and
 * persists explicit user choices. Rendering of children is gated until the
 * language is resolved to avoid an English-then-translated flash.
 */
export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const stored = await getStoredLanguage();
      const resolved = stored ?? detectDeviceLanguage();

      if (cancelled) {
        return;
      }

      if (i18n.language !== resolved) {
        await i18n.changeLanguage(resolved);
      }

      if (cancelled) {
        return;
      }

      setLanguageState(resolved);
      setIsReady(true);
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (next: LanguageCode) => {
    await i18n.changeLanguage(next);
    setLanguageState(next);
    await setStoredLanguage(next);
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  if (!isReady) {
    // Brief gate while the persisted/device language resolves.
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}
