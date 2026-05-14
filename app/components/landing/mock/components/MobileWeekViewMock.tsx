import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { LogoMark } from '~/components/shared/Logo';
import { SessionCard } from './SessionCard';
import { cn } from '~/lib/utils';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DATES = [20, 21, 22, 23, 24, 25, 26];
const TODAY_IDX = 5;

export function MobileWeekViewMock() {
  const { t } = useTranslation('landing');

  return (
    <div
      data-testid="mobile-week-view-mock"
      className="mx-auto w-full max-w-[360px] overflow-hidden rounded-t-[36px] border border-b-0 border-white/10 bg-[var(--landing-bg)] shadow-[0_-40px_80px_-20px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[12px] font-semibold opacity-90">
        <span className="landing-mono">9:41</span>
        <span aria-hidden="true">●●●</span>
      </div>

      <div className="flex items-center justify-between px-5 pt-2 pb-4">
        <div className="flex items-center gap-2.5">
          <LogoMark size="sm" />
          <div>
            <div className="text-[11px] tracking-[0.06em] opacity-60">{t('mock.mobile.hi')}</div>
            <div className="mt-0.5 text-[14px] font-semibold">
              {t('mock.mobile.athleteFirstName')}
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label={t('mock.appBar.notifications')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 opacity-80"
        >
          <Bell size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="px-5 pb-3">
        <div className="landing-mono text-[11px] tracking-[0.1em] uppercase opacity-60">
          {t('mock.mobile.week')} · {t('mock.mobile.dateRange')}
        </div>
        <div className="mt-1 text-[22px] font-bold tracking-tight">{t('mock.mobile.yourPlan')}</div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 px-4 pb-4">
        {DAY_KEYS.map((key, i) => {
          const isToday = i === TODAY_IDX;
          const isDone = i < TODAY_IDX && i !== 3 && i !== 4;
          return (
            <div
              key={key}
              data-testid="mobile-day"
              data-today={isToday ? 'true' : 'false'}
              className={cn(
                'flex flex-col items-center gap-1 rounded-[10px] py-2',
                isToday
                  ? 'bg-[image:var(--grad)] text-white'
                  : 'border border-white/10 bg-white/[0.03] opacity-80',
              )}
            >
              <span className="text-[9px] font-semibold tracking-[0.08em]">
                {t(`mock.days.${key}` as never)}
              </span>
              <span className="text-[13px] font-bold">{DATES[i]}</span>
              <span
                aria-hidden="true"
                className={cn(
                  'h-1 w-1 rounded-full',
                  isToday ? 'bg-white' : isDone ? 'bg-emerald-400' : 'bg-white/30',
                  (i === 3 || i === 4) && 'opacity-0',
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="px-4 pb-3">
        <div
          className="flex items-center justify-between gap-3 rounded-[14px] border border-emerald-500/20 p-4"
          style={{ background: 'var(--grad-soft)' }}
        >
          <div>
            <div className="landing-mono text-[10px] tracking-[0.12em] uppercase opacity-70">
              {t('mock.mobile.todayDate')}
            </div>
            <div className="mt-1 text-[18px] font-bold tracking-tight">
              {t('mock.mobile.sessionsPlanned')}
            </div>
          </div>
          <div className="text-right">
            <div className="landing-mono text-[10px] tracking-[0.12em] uppercase opacity-70">
              {t('mock.mobile.weekProgress')}
            </div>
            <div className="mt-1 text-[18px] font-bold">75%</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-5">
        <SessionCard
          sport="run"
          state="completed"
          title={t('mock.plan.mobileSat25Threshold.title')}
          meta={[
            ['Dur', '72m'],
            ['Pace', '3:54/km'],
            ['HR', '167'],
          ]}
        />
        <SessionCard
          sport="cycling"
          state="planned-mark"
          title={t('mock.plan.mobileSat25Cycling.title')}
          meta={[
            ['Dur', '90m'],
            ['Zone', 'Z2'],
          ]}
        />
        <SessionCard
          sport="swimming"
          state="planned"
          title={t('mock.plan.mobileSat25Swim.title')}
          meta={[
            ['Dur', '45m'],
            ['Dist', '1.8 km'],
          ]}
        />
      </div>
    </div>
  );
}
