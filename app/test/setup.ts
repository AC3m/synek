import '@testing-library/jest-dom';

// JSDOM does not implement IntersectionObserver — stub it so reveal hooks
// don't throw on mount. Tests that need to drive intersections override the
// global with their own controllable implementation.
class NoopIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): unknown[] {
    return [];
  }
}
if (!('IntersectionObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: NoopIntersectionObserver,
  });
}

// JSDOM does not implement window.matchMedia — stub it globally so hooks like
// useIsMobile don't throw in any test that renders components using it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enLanding from '~/i18n/resources/en/landing.json';
import plLanding from '~/i18n/resources/pl/landing.json';

// Initialise an i18n instance for tests with real landing resources so the
// landing components (which call useTranslation('landing')) resolve actual copy.
// Other namespaces stay minimal — they're not exercised by the landing tests.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        common: {},
        coach: {},
        athlete: {},
        landing: enLanding,
        training: {
          strength: {
            logger: {
              notesAdd: 'Add note',
              fillFromPrevious: 'Fill from previous',
            },
          },
        },
      },
      pl: {
        common: {},
        landing: plLanding,
      },
    },
    interpolation: { escapeValue: false },
  });
}
