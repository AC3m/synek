import { useTranslation } from 'react-i18next';
import { LogoMark } from '~/components/shared/Logo';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const DATES = [20, 21, 22, 23, 24, 25, 26] as const;
const TODAY_IDX = 5;

export function AthletePhone() {
  const { t } = useTranslation('landing');
  return (
    <div
      data-testid="athlete-phone"
      style={{
        position: 'relative',
        zIndex: 2,
        width: 252,
        maxWidth: '100%',
        marginLeft: 'auto',
        aspectRatio: '9 / 19',
        borderRadius: 36,
        background: 'linear-gradient(180deg, oklch(0.22 0.01 270), oklch(0.12 0.01 270))',
        padding: 9,
        boxShadow:
          '0 1px 0 rgba(255,255,255,.05) inset, 0 30px 80px -30px rgba(0,0,0,.7), 0 0 0 1px var(--landing-line)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 28,
          background: 'var(--landing-bg)',
          border: '1px solid var(--landing-line)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Notch */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 72,
            height: 18,
            borderRadius: 12,
            background: 'oklch(0.05 0 0)',
            zIndex: 5,
          }}
        />

        {/* Status bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px 0',
            fontFamily: 'var(--landing-font-mono)',
            fontSize: 11,
            color: 'var(--landing-fg)',
            height: 32,
          }}
        >
          <span>9:41</span>
          <span>••••</span>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '8px 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Greeting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size="sm" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1 }}>
                {t('mock.mobile.hi')} {t('mock.mobile.athleteFirstName')}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--landing-fg-3)',
                  fontFamily: 'var(--landing-font-mono)',
                  letterSpacing: '.04em',
                  marginTop: 3,
                }}
              >
                {t('mock.mobile.week')} · {t('mock.mobile.dateRange')}
              </div>
            </div>
          </div>

          {/* Week strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {DAYS.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '6px 0',
                  borderRadius: 8,
                  background:
                    i === TODAY_IDX
                      ? 'var(--grad)'
                      : 'color-mix(in oklab, var(--landing-bg-2) 70%, transparent)',
                  border: i === TODAY_IDX ? 'none' : '1px solid var(--landing-line)',
                  color: i === TODAY_IDX ? 'white' : undefined,
                }}
              >
                <span
                  style={{ fontSize: 8, fontWeight: 600, letterSpacing: '.06em', opacity: 0.8 }}
                >
                  {d}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{DATES[i]}</span>
              </div>
            ))}
          </div>

          {/* Today label */}
          <div
            style={{
              fontSize: 9.5,
              color: 'var(--landing-fg-3)',
              fontFamily: 'var(--landing-font-mono)',
              letterSpacing: '.1em',
              textTransform: 'uppercase',
            }}
          >
            {t('mock.mobile.todayDate')}
          </div>

          {/* Session cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              data-testid="athlete-phone-session"
              style={{
                borderRadius: 10,
                background: 'color-mix(in oklab, var(--landing-bg-2) 88%, transparent)',
                border: '1px solid var(--landing-line)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: '#4ade80',
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }}
                  />
                  {t('mock.sport.run')}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 3 3 5-6" />
                </svg>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.3 }}>
                {t('mock.plan.sat25Threshold.title')}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  fontSize: 10,
                  color: 'var(--landing-fg-3)',
                  fontFamily: 'var(--landing-font-mono)',
                }}
              >
                <span>
                  <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>72</b> min
                </span>
                <span>
                  <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>10.4</b> km
                </span>
                <span>
                  <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>3:54</b>/km
                </span>
              </div>
            </div>

            <div
              style={{
                borderRadius: 10,
                background: 'color-mix(in oklab, var(--landing-bg-2) 88%, transparent)',
                border: '1px solid var(--landing-line)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: '#a3e635',
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#a3e635' }}
                  />
                  {t('mock.sport.cycling')}
                </span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.3 }}>
                {t('mock.plan.sat25Cycling.title')}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  fontSize: 10,
                  color: 'var(--landing-fg-3)',
                  fontFamily: 'var(--landing-font-mono)',
                }}
              >
                <span>
                  <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>90</b> min
                </span>
                <span>
                  <b style={{ color: 'var(--landing-fg)', fontWeight: 600 }}>Z2</b>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
