import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SportIcon } from '~/components/landing/mock/SportIcon';
import { SportPill } from '~/components/landing/mock/SportPill';
import { SessionCard } from '~/components/landing/mock/SessionCard';
import { MockAppBar } from '~/components/landing/mock/MockAppBar';
import { WeekNav } from '~/components/landing/mock/WeekNav';
import { WeekSummary } from '~/components/landing/mock/WeekSummary';
import { useLocale } from '~/test/utils/landing-i18n';

let restore: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (restore) {
    await restore();
    restore = null;
  }
});

describe('SportIcon', () => {
  it('renders one SVG per sport', () => {
    (['run', 'cycling', 'swimming', 'strength', 'mobility', 'rest'] as const).forEach((sport) => {
      const { container, unmount } = render(<SportIcon sport={sport} />);
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    });
  });
});

describe('SportPill', () => {
  it('shows English sport label by default', () => {
    render(<SportPill sport="run" />);
    expect(screen.getByText('Run')).toBeInTheDocument();
  });

  it('shows Polish sport label when language is pl', async () => {
    restore = await useLocale('pl');
    render(<SportPill sport="run" />);
    expect(screen.getByText('Bieg')).toBeInTheDocument();
  });

  it('renders an icon alongside the label', () => {
    const { container } = render(<SportPill sport="cycling" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Cycling')).toBeInTheDocument();
  });

  it('exposes a data-sport attribute for styling/queries', () => {
    render(<SportPill sport="swimming" />);
    expect(screen.getByTestId('sport-pill').getAttribute('data-sport')).toBe('swimming');
  });
});

describe('SessionCard', () => {
  const baseProps = {
    sport: 'run' as const,
    title: 'Threshold 5×1km',
    meta: [
      ['Dur', '72m'],
      ['Pace', '3:54/km'],
    ] satisfies Array<[string, string]>,
  };

  it('renders title and meta pairs', () => {
    render(<SessionCard {...baseProps} state="completed" />);
    expect(screen.getByText('Threshold 5×1km')).toBeInTheDocument();
    expect(screen.getByText('Dur')).toBeInTheDocument();
    expect(screen.getByText('72m')).toBeInTheDocument();
  });

  it('marks completed states with a check indicator', () => {
    render(<SessionCard {...baseProps} state="completed" />);
    expect(screen.getByTestId('session-card-check')).toBeInTheDocument();
  });

  it('does not show a check indicator on planned state', () => {
    render(<SessionCard {...baseProps} state="planned" />);
    expect(screen.queryByTestId('session-card-check')).not.toBeInTheDocument();
  });

  it('renders "Mark complete" button only on planned-mark state', () => {
    const { rerender } = render(<SessionCard {...baseProps} state="planned" />);
    expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument();

    rerender(<SessionCard {...baseProps} state="planned-mark" />);
    expect(screen.getByRole('button', { name: /mark complete/i })).toBeInTheDocument();
  });

  it('localizes "Mark complete" button (PL)', async () => {
    restore = await useLocale('pl');
    render(<SessionCard {...baseProps} state="planned-mark" />);
    expect(screen.getByRole('button', { name: /oznacz jako ukończone/i })).toBeInTheDocument();
  });

  it('animatedOn=false dims the card; animatedOn=true brightens it', () => {
    const { rerender } = render(
      <SessionCard {...baseProps} state="completed" animatedOn={false} />,
    );
    expect(screen.getByTestId('session-card').getAttribute('data-animated')).toBe('false');

    rerender(<SessionCard {...baseProps} state="completed" animatedOn={true} />);
    expect(screen.getByTestId('session-card').getAttribute('data-animated')).toBe('true');
  });
});

describe('MockAppBar', () => {
  it('shows SYNEK brand', () => {
    render(<MockAppBar />);
    expect(screen.getByText('SYNEK')).toBeInTheDocument();
  });

  it('shows 3 nav tabs localized (EN)', () => {
    render(<MockAppBar />);
    expect(screen.getByRole('tab', { name: /training/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /goals/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();
  });

  it('marks active tab with aria-selected=true', () => {
    render(<MockAppBar activeTab="training" />);
    expect(screen.getByRole('tab', { name: /training/i }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: /goals/i }).getAttribute('aria-selected')).toBe('false');
  });

  it('shows search, notifications, and avatar', () => {
    render(<MockAppBar />);
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/JS/i)).toBeInTheDocument();
  });

  it('localizes nav tabs (PL)', async () => {
    restore = await useLocale('pl');
    render(<MockAppBar />);
    expect(screen.getByRole('tab', { name: /trening/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /cele/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /analityka/i })).toBeInTheDocument();
  });
});

describe('WeekNav', () => {
  it('shows week number + date range (EN)', () => {
    render(<WeekNav weekNumber={17} dateRange="Apr 20 – 26" />);
    expect(screen.getByText(/Week 17/i)).toBeInTheDocument();
    expect(screen.getByText(/Apr 20 – 26/)).toBeInTheDocument();
  });

  it('shows week number + date range (PL)', async () => {
    restore = await useLocale('pl');
    render(<WeekNav weekNumber={17} dateRange="20 – 26 kwi" />);
    expect(screen.getByText(/Tydzień 17/i)).toBeInTheDocument();
    expect(screen.getByText(/20 – 26 kwi/)).toBeInTheDocument();
  });

  it('exposes prev/next buttons with accessible labels', () => {
    render(<WeekNav weekNumber={17} dateRange="Apr 20 – 26" />);
    expect(screen.getByLabelText(/previous week/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next week/i)).toBeInTheDocument();
  });

  it('shows Today button on the right (after the next chevron in DOM order)', () => {
    render(<WeekNav weekNumber={17} dateRange="Apr 20 – 26" />);
    const container = screen.getByTestId('week-nav');
    const today = within(container).getByRole('button', { name: /today/i });
    const next = within(container).getByLabelText(/next week/i);
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.indexOf(today as HTMLButtonElement)).toBeGreaterThan(
      buttons.indexOf(next as HTMLButtonElement),
    );
  });
});

describe('WeekSummary', () => {
  const props = {
    plan: {
      distanceKm: 41,
      timeLabel: '6h 40',
      sessions: 8,
      load: 'Medium',
    },
    performance: {
      distanceKm: 31.6,
      distanceOfPlanPct: 77,
      timeLabel: '3h 37',
      sessionsDone: 6,
      sessionsTotal: 8,
      completionPct: 75,
    },
  };

  it('shows PLAN and PERFORMANCE columns (EN)', () => {
    render(<WeekSummary {...props} />);
    expect(screen.getByText(/PLAN/)).toBeInTheDocument();
    expect(screen.getByText(/PERFORMANCE/i)).toBeInTheDocument();
  });

  it('localizes column labels (PL)', async () => {
    restore = await useLocale('pl');
    render(<WeekSummary {...props} />);
    expect(screen.getByText(/WYKONANIE/i)).toBeInTheDocument();
  });

  it('renders 4 stat blocks per side', () => {
    render(<WeekSummary {...props} />);
    expect(screen.getAllByTestId('stat-block')).toHaveLength(8);
  });

  it('completion progress bar width matches the percent', () => {
    render(<WeekSummary {...props} />);
    const fill = screen.getByTestId('progress-fill');
    expect(fill.getAttribute('style')).toContain('75%');
  });

  it('exposes a segmented Cumulative / By sport control with Cumulative active', () => {
    render(<WeekSummary {...props} />);
    const cumulative = screen.getByRole('button', { name: /cumulative/i });
    const bySport = screen.getByRole('button', { name: /by sport/i });
    expect(cumulative.getAttribute('aria-pressed')).toBe('true');
    expect(bySport.getAttribute('aria-pressed')).toBe('false');
  });
});
