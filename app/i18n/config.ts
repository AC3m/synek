import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './resources/en/common.json';
import enCoach from './resources/en/coach.json';
import enAthlete from './resources/en/athlete.json';
import enTraining from './resources/en/training.json';
import enLanding from './resources/en/landing.json';
import enLegal from './resources/en/legal.json';
import plCommon from './resources/pl/common.json';
import plCoach from './resources/pl/coach.json';
import plAthlete from './resources/pl/athlete.json';
import plTraining from './resources/pl/training.json';
import plLanding from './resources/pl/landing.json';
import plLegal from './resources/pl/legal.json';

const resources = {
  en: {
    common: enCommon,
    coach: enCoach,
    athlete: enAthlete,
    training: enTraining,
    landing: enLanding,
    legal: enLegal,
  },
  pl: {
    common: plCommon,
    coach: plCoach,
    athlete: plAthlete,
    training: plTraining,
    landing: plLanding,
    legal: plLegal,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'pl',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'coach', 'athlete', 'training', 'landing', 'legal'],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
