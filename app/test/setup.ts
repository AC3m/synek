import '@testing-library/jest-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Initialise a minimal i18n instance for tests.
// Components using useTranslation will resolve keys without throwing.
// Using empty resource bundles means t('key') returns 'key' — predictable in assertions.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        common: {},
        coach: {},
        athlete: {},
        training: {},
      },
    },
    interpolation: { escapeValue: false },
  });
}
