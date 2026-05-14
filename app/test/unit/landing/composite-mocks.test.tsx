import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { WeekGridMock } from '~/components/landing/mock/WeekGridMock';
import { MobileWeekViewMock } from '~/components/landing/mock/MobileWeekViewMock';
import { useLocale } from '~/test/utils/landing-i18n';

let restore: (() => Promise<void>) | null = null;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  vi.useRealTimers();
  if (restore) {
    await restore();
    restore = null;
  }
});

describe('WeekGridMock', () => {
  it('renders app bar, week nav, week summary and 7 day columns', () => {
    render(<WeekGridMock />);
    expect(screen.getByText('SYNEK')).toBeInTheDocument();
    expect(screen.getByText(/Week 17/)).toBeInTheDocument();
    expect(screen.getByText(/Week summary/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('day-column')).toHaveLength(7);
  });

  it('localizes day codes (EN: MON–SUN)', () => {
    render(<WeekGridMock />);
    ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach((d) => {
      expect(screen.getByText(d)).toBeInTheDocument();
    });
  });

  it('localizes day codes (PL: PON–ND)', async () => {
    vi.useRealTimers();
    restore = await useLocale('pl');
    vi.useFakeTimers();
    render(<WeekGridMock />);
    ['PON', 'WT', 'ŚR', 'CZW', 'PT', 'SOB', 'ND'].forEach((d) => {
      expect(screen.getByText(d)).toBeInTheDocument();
    });
  });

  it('marks the today column (SAT 25) with data-today', () => {
    render(<WeekGridMock />);
    const todayCols = screen
      .getAllByTestId('day-column')
      .filter((el) => el.dataset.today === 'true');
    expect(todayCols).toHaveLength(1);
    expect(within(todayCols[0]).getByText('25')).toBeInTheDocument();
  });

  it('renders all session titles from the static plan', () => {
    render(<WeekGridMock />);
    expect(screen.getByText(/Threshold 5×1km/)).toBeInTheDocument();
    expect(screen.getByText('FBW B')).toBeInTheDocument();
    expect(screen.getByText('Rest day')).toBeInTheDocument();
    expect(screen.getByText(/Long run/)).toBeInTheDocument();
  });

  it('reveals session cards progressively over time', () => {
    render(<WeekGridMock />);
    const cardsAtStart = screen
      .getAllByTestId('session-card')
      .filter((c) => c.dataset.animated === 'true');
    expect(cardsAtStart.length).toBeLessThan(10);

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    const cardsAfter = screen
      .getAllByTestId('session-card')
      .filter((c) => c.dataset.animated === 'true');
    expect(cardsAfter.length).toBeGreaterThan(cardsAtStart.length);
  });

  it('renders no Strava text anywhere', () => {
    const { container } = render(<WeekGridMock />);
    expect(container.textContent?.toLowerCase()).not.toContain('strava');
    expect(container.textContent?.toLowerCase()).not.toContain('powered by');
  });
});

describe('MobileWeekViewMock', () => {
  it('shows localized greeting (EN)', () => {
    render(<MobileWeekViewMock />);
    expect(screen.getByText(/Hi,/i)).toBeInTheDocument();
    expect(screen.getByText(/Artur/)).toBeInTheDocument();
  });

  it('shows localized greeting (PL)', async () => {
    vi.useRealTimers();
    restore = await useLocale('pl');
    vi.useFakeTimers();
    render(<MobileWeekViewMock />);
    expect(screen.getByText(/Cześć,/i)).toBeInTheDocument();
  });

  it('renders 7 day cells with today highlighted', () => {
    render(<MobileWeekViewMock />);
    const dayCells = screen.getAllByTestId('mobile-day');
    expect(dayCells).toHaveLength(7);
    const today = dayCells.filter((c) => c.dataset.today === 'true');
    expect(today).toHaveLength(1);
  });

  it('shows the today summary with sessions planned and week progress', () => {
    render(<MobileWeekViewMock />);
    expect(screen.getByText(/2 sessions planned/i)).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it('renders 3 session cards on the today list', () => {
    render(<MobileWeekViewMock />);
    expect(screen.getAllByTestId('session-card').length).toBeGreaterThanOrEqual(3);
  });

  it('renders no Strava text anywhere', () => {
    const { container } = render(<MobileWeekViewMock />);
    expect(container.textContent?.toLowerCase()).not.toContain('strava');
    expect(container.textContent?.toLowerCase()).not.toContain('powered by');
  });
});
