import { useContext } from 'react';

import { LanguageContext } from '@/context/LanguageContext';

// Access the active language and the setter that switches + persists it.
export function useLanguage() {
  return useContext(LanguageContext);
}
