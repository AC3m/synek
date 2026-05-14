import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekNavProps {
  weekNumber: number;
  dateRange: string;
}

export function WeekNav({ weekNumber, dateRange }: WeekNavProps) {
  const { t } = useTranslation('landing');
  return (
    <div
      data-testid="week-nav"
      className="inline-flex flex-none items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1 whitespace-nowrap"
    >
      <button
        type="button"
        aria-label={t('mock.weekNav.previousWeek')}
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm opacity-80 hover:opacity-100"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <div className="flex items-center gap-2 px-2 text-[12.5px]">
        <span className="font-semibold">
          {t('mock.weekNav.week')} {weekNumber}
        </span>
        <span className="opacity-40">·</span>
        <span className="opacity-70">{dateRange}</span>
      </div>
      <button
        type="button"
        aria-label={t('mock.weekNav.nextWeek')}
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm opacity-80 hover:opacity-100"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
      <span className="mx-1 h-4 w-px bg-white/10" aria-hidden="true" />
      <button
        type="button"
        className="rounded-sm px-2 py-1 text-[12px] font-semibold opacity-90 hover:opacity-100"
      >
        {t('mock.weekNav.today')}
      </button>
    </div>
  );
}
