import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './resources/en/common.json';
import enCoach from './resources/en/coach.json';
import enTrainee from './resources/en/trainee.json';
import enTraining from './resources/en/training.json';
import plCommon from './resources/pl/common.json';
import plCoach from './resources/pl/coach.json';
import plTrainee from './resources/pl/trainee.json';
import plTraining from './resources/pl/training.json';

const resources = {
  en: {
    common: enCommon,
    coach: enCoach,
    trainee: enTrainee,
    training: enTraining,
  },
  pl: {
    common: plCommon,
    coach: plCoach,
    trainee: plTrainee,
    training: plTraining,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: typeof window !== 'undefined'
    ? localStorage.getItem('language') || 'en'
    : 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'coach', 'trainee', 'training'],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
