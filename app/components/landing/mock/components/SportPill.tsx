import { useTranslation } from 'react-i18next';
import { SportIcon } from './SportIcon';
import { SPORT_COLORS, type Sport } from '../data/sports';

interface SportPillProps {
  sport: Sport;
}

export function SportPill({ sport }: SportPillProps) {
  const { t } = useTranslation('landing');
  const c = SPORT_COLORS[sport];
  return (
    <span
      data-testid="sport-pill"
      data-sport={sport}
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] leading-tight font-semibold"
      style={{ background: c.bg, borderColor: c.bd, color: c.fg }}
    >
      <SportIcon sport={sport} size={11} />
      {t(`mock.sport.${sport}` as never)}
    </span>
  );
}
