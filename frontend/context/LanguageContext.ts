import { createContext } from 'react';

import { DEFAULT_LANGUAGE, type LanguageCode } from '@/i18n/languages';

export interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: async () => {},
});
