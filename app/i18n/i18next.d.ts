import 'i18next';
import type common from './resources/en/common.json';
import type coach from './resources/en/coach.json';
import type trainee from './resources/en/trainee.json';
import type training from './resources/en/training.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      coach: typeof coach;
      trainee: typeof trainee;
      training: typeof training;
    };
  }
}
