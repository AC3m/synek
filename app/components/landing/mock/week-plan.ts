import type { Sport } from './sports';
import type { SessionState } from './SessionCard';

export interface PlanCard {
  sport: Sport;
  state: SessionState;
  titleKey: string;
  meta?: Array<[string, string]>;
}

export interface PlanDay {
  dayKey: string;
  date: number;
  today?: boolean;
  cards: PlanCard[];
}

export const STATIC_WEEK_PLAN: PlanDay[] = [
  {
    dayKey: 'mon',
    date: 20,
    cards: [
      {
        sport: 'run',
        state: 'completed',
        titleKey: 'mock.plan.mon20.title',
        meta: [
          ['Dur', '42m'],
          ['Dist', '8.1 km'],
        ],
      },
    ],
  },
  {
    dayKey: 'tue',
    date: 21,
    cards: [
      {
        sport: 'strength',
        state: 'completed',
        titleKey: 'mock.plan.tue21Strength.title',
        meta: [
          ['Dur', '58m'],
          ['HR', '116'],
        ],
      },
      {
        sport: 'swimming',
        state: 'completed',
        titleKey: 'mock.plan.tue21Swim.title',
        meta: [
          ['Dur', '45m'],
          ['Dist', '1.8 km'],
        ],
      },
    ],
  },
  {
    dayKey: 'wed',
    date: 22,
    cards: [
      {
        sport: 'run',
        state: 'completed',
        titleKey: 'mock.plan.wed22Run.title',
        meta: [
          ['Dur', '46m'],
          ['Dist', '8.2 km'],
        ],
      },
      {
        sport: 'strength',
        state: 'completed',
        titleKey: 'mock.plan.wed22Strength.title',
        meta: [['Dur', '55m']],
      },
    ],
  },
  {
    dayKey: 'thu',
    date: 23,
    cards: [
      {
        sport: 'rest',
        state: 'planned',
        titleKey: 'mock.plan.thu23Rest.title',
      },
    ],
  },
  {
    dayKey: 'fri',
    date: 24,
    cards: [
      {
        sport: 'mobility',
        state: 'planned',
        titleKey: 'mock.plan.fri24Mobility.title',
        meta: [['Dur', '30m']],
      },
    ],
  },
  {
    dayKey: 'sat',
    date: 25,
    today: true,
    cards: [
      {
        sport: 'run',
        state: 'completed',
        titleKey: 'mock.plan.sat25Threshold.title',
        meta: [
          ['Dur', '72m'],
          ['Pace', '3:54/km'],
        ],
      },
      {
        sport: 'cycling',
        state: 'planned-mark',
        titleKey: 'mock.plan.sat25Cycling.title',
        meta: [['Dur', '90m']],
      },
    ],
  },
  {
    dayKey: 'sun',
    date: 26,
    cards: [
      {
        sport: 'run',
        state: 'planned',
        titleKey: 'mock.plan.sun26Long.title',
        meta: [
          ['Dur', '110m'],
          ['Dist', '19 km'],
        ],
      },
    ],
  },
];

export function totalCards(plan: PlanDay[] = STATIC_WEEK_PLAN) {
  return plan.reduce((n, d) => n + d.cards.length, 0);
}
