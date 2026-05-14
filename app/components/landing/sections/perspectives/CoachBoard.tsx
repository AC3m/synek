import { useTranslation } from 'react-i18next';
import { LogoMark } from '~/components/shared/Logo';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DATES = [20, 21, 22, 23, 24, 25, 26] as const;
const TODAY_IDX = 5;

const SPORT_COLORS: Record<string, string> = {
  run: '#4ade80',
  cycling: '#a3e635',
  strength: '#fb923c',
  mobility: '#c084fc',
};

interface Cell {
  sport: string;
  done?: boolean;
}

const CELLS: (Cell | null)[] = [
  { sport: 'run', done: true },
  { sport: 'strength', done: true },
  { sport: 'run', done: true },
  null,
  { sport: 'mobility' },
  { sport: 'run', done: true },
  { sport: 'run' },
];

const APP_TABS = ['training', 'goals', 'analytics'] as const;

export function CoachBoard() {
  const { t } = useTranslation('landing');

  return (
    <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
      <div
        style={{
          background: 'var(--landing-bg-2)',
          border: '1px solid var(--landing-line)',
          borderRadius: 14,
          boxShadow: 'var(--landing-shadow-card)',
          overflow: 'hidden',
        }}
      >
        {/* App bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid var(--landing-line)',
            background: 'color-mix(in oklab, var(--landing-bg) 28%, transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 700,
                letterSpacing: '.04em',
                fontSize: 12,
                paddingRight: 12,
                borderRight: '1px solid var(--landing-line)',
              }}
            >
              <LogoMark size="sm" />
              SYNEK
            </span>
            {APP_TABS.map((tab, i) => (
              <span
                key={tab}
                style={{
                  fontSize: 11.5,
                  color: i === 0 ? 'var(--landing-fg)' : 'var(--landing-fg-3)',
                  padding: '4px 8px',
                  borderRadius: 6,
                  background:
                    i === 0 ? 'color-mix(in oklab, var(--landing-fg) 7%, transparent)' : undefined,
                }}
              >
                {t(`mock.appBar.${tab}` as never)}
              </span>
            ))}
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--grad)',
              color: 'white',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '.04em',
            }}
          >
            {t('mock.appBar.avatarInitials')}
          </span>
        </div>

        {/* Title + week nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px 10px',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.01em' }}>
              {t('mock.athleteView.title')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--landing-fg-3)', marginTop: 2 }}>
              {t('mock.athleteView.subtitle')}
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: '1px solid var(--landing-line)',
              borderRadius: 8,
              padding: '3px 4px',
              background: 'color-mix(in oklab, var(--landing-bg) 30%, transparent)',
              whiteSpace: 'nowrap',
            }}
          >
            <button
              aria-label={t('mock.weekNav.previousWeek')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                border: 0,
                background: 'transparent',
                color: 'var(--landing-fg-2)',
                borderRadius: 5,
                cursor: 'pointer',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: 'rotate(180deg)' }}
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '0 8px' }}>
              {t('mock.weekNav.week')} 17 · {t('mock.athleteView.dateRange')}
            </span>
            <button
              aria-label={t('mock.weekNav.nextWeek')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                border: 0,
                background: 'transparent',
                color: 'var(--landing-fg-2)',
                borderRadius: 5,
                cursor: 'pointer',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Week summary stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1px 1fr',
            gap: 18,
            padding: '0 18px',
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--landing-font-mono)',
                fontSize: 9,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'var(--landing-fg-4)',
                marginBottom: 6,
              }}
            >
              {t('mock.weekSummary.plan')}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                fontSize: 12,
                color: 'var(--landing-fg-3)',
              }}
            >
              <span>
                <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>~41.0</b> km
              </span>
              <span>
                <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>8</b> sessions
              </span>
              <span>
                <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>6h 40</b> min
              </span>
            </div>
          </div>
          <div style={{ background: 'var(--landing-line)' }} />
          <div>
            <div
              style={{
                fontFamily: 'var(--landing-font-mono)',
                fontSize: 9,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'var(--landing-fg-4)',
                marginBottom: 6,
              }}
            >
              {t('mock.weekSummary.performance')}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                fontSize: 12,
                color: 'var(--landing-fg-3)',
              }}
            >
              <span>
                <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>31.6</b> km
              </span>
              <span>
                <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>6/8</b>
              </span>
              <span>
                <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>75%</b>
              </span>
            </div>
          </div>
        </div>

        {/* 7-day week grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 6,
            padding: '0 14px 14px',
          }}
        >
          {DAY_KEYS.map((dayKey, i) => {
            const cell = CELLS[i];
            const isToday = i === TODAY_IDX;
            const color = cell ? SPORT_COLORS[cell.sport] : undefined;
            return (
              <div
                key={dayKey}
                data-testid="coach-row"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  border: `1px solid ${isToday ? 'color-mix(in oklab, var(--landing-fg) 16%, var(--landing-line))' : 'var(--landing-line)'}`,
                  borderRadius: 8,
                  padding: 8,
                  background: isToday
                    ? 'color-mix(in oklab, var(--landing-bg) 10%, transparent)'
                    : 'color-mix(in oklab, var(--landing-bg) 22%, transparent)',
                  minHeight: 64,
                }}
              >
                <div
                  data-testid="coach-day-header"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    paddingBottom: 6,
                    borderBottom: '1px solid var(--landing-line)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--landing-font-mono)',
                      fontSize: 9,
                      letterSpacing: '.12em',
                      color: 'var(--landing-fg-3)',
                      fontWeight: 600,
                    }}
                  >
                    {t(`mock.days.${dayKey}` as never)}
                  </span>
                  <span
                    style={
                      isToday
                        ? {
                            background: 'var(--grad)',
                            color: 'white',
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                            marginLeft: 'auto',
                          }
                        : {
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--landing-fg-2)',
                            marginLeft: 'auto',
                          }
                    }
                  >
                    {DATES[i]}
                  </span>
                </div>

                {cell ? (
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: 7,
                      background: 'color-mix(in oklab, var(--landing-bg-2) 92%, transparent)',
                      border: '1px solid var(--landing-line)',
                      padding: '7px 8px 7px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 6,
                        bottom: 6,
                        width: 2,
                        borderRadius: 2,
                        background: color,
                      }}
                    />
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 9.5,
                        fontWeight: 600,
                        color,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      {t(`mock.sport.${cell.sport}` as never)}
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: 7,
                      border: '1px dashed var(--landing-line)',
                      minHeight: 44,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
