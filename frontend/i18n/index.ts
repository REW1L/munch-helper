import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE } from './languages';
import { DEFAULT_NAMESPACE, resources } from './resources';

// Initialize i18next synchronously with all catalogs bundled inline. Because no
// async backend is used, `i18n.t()` is usable immediately (even before the
// device-locale/persisted preference is resolved), which keeps `t()` returning
// English in unit tests and prevents a render crash on first paint.
//
// The active language is switched later at runtime by the LanguageProvider once
// the saved preference / device locale has been resolved.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: DEFAULT_NAMESPACE,
    ns: [DEFAULT_NAMESPACE],
    returnNull: false,
    interpolation: {
      // React Native already escapes rendered text; disable i18next's HTML escaping.
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
