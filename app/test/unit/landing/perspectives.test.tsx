import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoachBoard } from '~/components/landing/sections/perspectives/CoachBoard';
import { AthletePhone } from '~/components/landing/sections/perspectives/AthletePhone';
import { SyncLine } from '~/components/landing/sections/perspectives/SyncLine';
import { PerspectivesSection } from '~/components/landing/sections/perspectives/PerspectivesSection';
import { useLocale } from '~/test/utils/landing-i18n';

let restore: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (restore) {
    await restore();
    restore = null;
  }
});

describe('CoachBoard', () => {
  it('renders at least 3 athlete rows', () => {
    render(<CoachBoard />);
    expect(screen.getAllByTestId('coach-row').length).toBeGreaterThanOrEqual(3);
  });

  it('renders 7 day columns in the header', () => {
    render(<CoachBoard />);
    expect(screen.getAllByTestId('coach-day-header')).toHaveLength(7);
  });
});

describe('AthletePhone', () => {
  it('renders a phone-shaped surface with a session title', () => {
    render(<AthletePhone />);
    expect(screen.getByTestId('athlete-phone')).toBeInTheDocument();
    expect(screen.getByTestId('athlete-phone-session')).toBeInTheDocument();
  });

  it('shows "Today" label', () => {
    render(<AthletePhone />);
    expect(screen.getByText(/today/i)).toBeInTheDocument();
  });
});

describe('SyncLine', () => {
  it('renders decorative connector with aria-hidden', () => {
    render(<SyncLine />);
    expect(screen.getByTestId('sync-line').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('PerspectivesSection', () => {
  it('renders heading + lede', () => {
    render(<PerspectivesSection />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Plan on desktop/i)).toBeInTheDocument();
  });

  it('renders coach board, sync line and athlete phone', () => {
    render(<PerspectivesSection />);
    expect(screen.getAllByTestId('coach-row').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('sync-line')).toBeInTheDocument();
    expect(screen.getByTestId('athlete-phone')).toBeInTheDocument();
  });

  it('renders 4 bullet rows with check icons', () => {
    render(<PerspectivesSection />);
    expect(screen.getAllByTestId('perspective-bullet')).toHaveLength(4);
  });

  it('localizes (PL)', async () => {
    restore = await useLocale('pl');
    render(<PerspectivesSection />);
    expect(screen.getByText(/Planuj na desktopie/i)).toBeInTheDocument();
  });
});
