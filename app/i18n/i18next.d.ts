import 'i18next';
import type common from './resources/en/common.json';
import type coach from './resources/en/coach.json';
import type athlete from './resources/en/athlete.json';
import type training from './resources/en/training.json';
import type landing from './resources/en/landing.json';
import type legal from './resources/en/legal.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      coach: typeof coach;
      athlete: typeof athlete;
      training: typeof training;
      landing: typeof landing;
      legal: typeof legal;
    };
  }
}
