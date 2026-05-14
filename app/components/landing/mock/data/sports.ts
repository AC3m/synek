export type Sport = 'run' | 'cycling' | 'swimming' | 'strength' | 'mobility' | 'rest';

interface SportColor {
  fg: string;
  bg: string;
  bd: string;
}

export const SPORT_COLORS: Record<Sport, SportColor> = {
  run: { fg: '#4ade80', bg: 'rgba(74,222,128,.10)', bd: 'rgba(74,222,128,.32)' },
  cycling: { fg: '#a3e635', bg: 'rgba(163,230,53,.10)', bd: 'rgba(163,230,53,.32)' },
  swimming: { fg: '#38bdf8', bg: 'rgba(56,189,248,.10)', bd: 'rgba(56,189,248,.32)' },
  strength: { fg: '#fb923c', bg: 'rgba(251,146,60,.10)', bd: 'rgba(251,146,60,.32)' },
  mobility: { fg: '#c084fc', bg: 'rgba(192,132,252,.10)', bd: 'rgba(192,132,252,.32)' },
  rest: { fg: '#94a3b8', bg: 'rgba(148,163,184,.08)', bd: 'rgba(148,163,184,.22)' },
};
