import { useParams, Link } from 'react-router';
import '~/components/landing/landing.css';
import { Eyebrow } from '~/components/landing/primitives/Eyebrow';
import { GradText } from '~/components/landing/primitives/GradText';
import { SectionHead } from '~/components/landing/primitives/SectionHead';
import { useReveal } from '~/components/landing/hooks/useReveal';
import { LogoLink } from '~/components/landing/layout/LogoLink';
import { SportPill } from '~/components/landing/mock/components/SportPill';
import { SessionCard } from '~/components/landing/mock/components/SessionCard';
import { MockAppBar } from '~/components/landing/mock/components/MockAppBar';
import { WeekNav } from '~/components/landing/mock/components/WeekNav';
import { WeekSummary } from '~/components/landing/mock/components/WeekSummary';
import { WeekGridMock } from '~/components/landing/mock/components/WeekGridMock';
import { MobileWeekViewMock } from '~/components/landing/mock/components/MobileWeekViewMock';
import { HeroSection } from '~/components/landing/sections/hero/HeroSection';
import { WhySection } from '~/components/landing/sections/why/WhySection';
import { FeaturesSection } from '~/components/landing/sections/features/FeaturesSection';
import { PerspectivesSection } from '~/components/landing/sections/perspectives/PerspectivesSection';
import { JoinBetaSection } from '~/components/landing/sections/join-beta/JoinBetaSection';
import { ContactSection } from '~/components/landing/sections/contact/ContactSection';
import { LandingFooter } from '~/components/landing/layout/LandingFooter';

function RevealDemo() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="landing-reveal rounded-md border border-white/10 bg-white/5 p-6">
      Scroll-revealed block (fades + slides in once visible).
    </div>
  );
}

const PREVIEW_REGISTRY: Record<string, { label: string; node: React.ReactNode }> = {
  eyebrow: {
    label: 'Eyebrow',
    node: <Eyebrow>Why SYNEK</Eyebrow>,
  },
  'grad-text': {
    label: 'GradText',
    node: (
      <p className="landing-display text-4xl">
        Train with intent. <GradText>Together.</GradText>
      </p>
    ),
  },
  'section-head': {
    label: 'SectionHead',
    node: (
      <SectionHead
        eyebrow="Two perspectives, one source"
        heading={
          <>
            Plan on desktop. <GradText>Run on phone.</GradText>
          </>
        }
        lede="Coach builds the week from the board. Athlete opens the app and sees today's session — same data, never out of sync."
      />
    ),
  },
  reveal: {
    label: 'useReveal',
    node: <RevealDemo />,
  },
  'logo-link': {
    label: 'LogoLink (sizes 22 / 40 / 80)',
    node: (
      <div className="flex items-center gap-10">
        <LogoLink size={22} />
        <LogoLink size={40} />
        <LogoLink size={80} />
        <span className="flex items-center gap-3 text-2xl font-semibold">
          <LogoLink size={28} />
          SYNEK
        </span>
      </div>
    ),
  },
  'sport-pills': {
    label: 'SportPill — all sports',
    node: (
      <div className="flex flex-wrap gap-3">
        {(['run', 'cycling', 'swimming', 'strength', 'mobility', 'rest'] as const).map((s) => (
          <SportPill key={s} sport={s} />
        ))}
      </div>
    ),
  },
  'session-card': {
    label: 'SessionCard — all states',
    node: (
      <div className="grid max-w-[720px] grid-cols-2 gap-4">
        <SessionCard
          sport="run"
          title="Threshold 5×1km / 1' walk"
          state="completed"
          meta={[
            ['Dur', '72m'],
            ['Pace', '3:54/km'],
          ]}
        />
        <SessionCard
          sport="strength"
          title="FBW B"
          state="completed-sync"
          meta={[['Dur', '55m']]}
        />
        <SessionCard
          sport="cycling"
          title="Z2 indoor bike"
          state="planned-mark"
          meta={[['Dur', '90m']]}
        />
        <SessionCard
          sport="mobility"
          title="Mobility 30m + foam"
          state="planned"
          meta={[['Dur', '30m']]}
        />
        <SessionCard sport="rest" title="Rest day" state="planned" />
        <SessionCard
          sport="swimming"
          title="Swim — technique"
          state="completed-confirm"
          meta={[
            ['Dur', '45m'],
            ['Dist', '1.8 km'],
          ]}
        />
      </div>
    ),
  },
  'app-bar': {
    label: 'MockAppBar',
    node: (
      <div className="rounded-xl border border-white/10 bg-black/30 [&>div]:rounded-xl">
        <MockAppBar />
      </div>
    ),
  },
  'week-nav': {
    label: 'WeekNav',
    node: (
      <div className="flex items-center justify-end p-4">
        <WeekNav weekNumber={17} dateRange="Apr 20 – 26" />
      </div>
    ),
  },
  'week-grid-mock': {
    label: 'WeekGridMock (desktop athlete view)',
    node: <WeekGridMock />,
  },
  hero: {
    label: 'HeroSection',
    node: (
      <div className="-m-8">
        <HeroSection />
      </div>
    ),
  },
  why: {
    label: 'WhySection',
    node: (
      <div className="-m-8">
        <WhySection />
      </div>
    ),
  },
  features: {
    label: 'FeaturesSection',
    node: (
      <div className="-m-8">
        <FeaturesSection />
      </div>
    ),
  },
  perspectives: {
    label: 'PerspectivesSection',
    node: (
      <div className="-m-8">
        <PerspectivesSection />
      </div>
    ),
  },
  'join-beta': {
    label: 'JoinBetaSection',
    node: (
      <div className="-m-8">
        <JoinBetaSection />
      </div>
    ),
  },
  contact: {
    label: 'ContactSection',
    node: (
      <div className="-m-8">
        <ContactSection />
      </div>
    ),
  },
  footer: {
    label: 'LandingFooter',
    node: (
      <div className="-m-8">
        <LandingFooter />
      </div>
    ),
  },
  'mobile-week-view-mock': {
    label: 'MobileWeekViewMock (phone)',
    node: (
      <div className="flex justify-center">
        <MobileWeekViewMock />
      </div>
    ),
  },
  'week-summary': {
    label: 'WeekSummary',
    node: (
      <WeekSummary
        plan={{ distanceKm: 41, timeLabel: '6h 40', sessions: 8, load: 'Medium' }}
        performance={{
          distanceKm: 31.6,
          distanceOfPlanPct: 77,
          timeLabel: '3h 37',
          sessionsDone: 6,
          sessionsTotal: 8,
          completionPct: 75,
        }}
      />
    ),
  },
};

export function meta() {
  return [{ title: 'Landing preview' }];
}

export default function LandingPreview() {
  const { component = '' } = useParams<{ component: string }>();
  const entry = PREVIEW_REGISTRY[component];

  return (
    <div data-landing className="min-h-dvh p-10">
      <header className="mb-8 flex items-baseline gap-6">
        <Link to="/landing-preview" className="text-sm opacity-60 hover:opacity-100">
          ← index
        </Link>
        <h1 className="landing-display text-2xl">{entry?.label ?? 'Pick a component'}</h1>
      </header>

      {entry ? (
        <div className="rounded-xl border border-white/10 bg-black/30 p-8">{entry.node}</div>
      ) : (
        <ul className="grid gap-2 text-sm">
          {Object.entries(PREVIEW_REGISTRY).map(([slug, def]) => (
            <li key={slug}>
              <Link
                to={`/landing-preview/${slug}`}
                className="underline opacity-80 hover:opacity-100"
              >
                {def.label}
              </Link>
            </li>
          ))}
          {Object.keys(PREVIEW_REGISTRY).length === 0 && (
            <li className="opacity-60">No components registered yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
