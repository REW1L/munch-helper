import type { DEFAULT_NAMESPACE } from './resources';
import type en from './locales/en';

// Give `t()` compile-time key checking against the English source catalog, so
// typos or missing keys during extraction are caught by `tsc`.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: {
      translation: typeof en;
    };
  }
}
