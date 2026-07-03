import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Initialize i18next synchronously (English) so components using useTranslation
// resolve real strings in tests instead of raw keys.
import '@/i18n';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
});
