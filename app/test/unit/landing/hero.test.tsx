import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { HeroBetaPill } from '~/components/landing/sections/hero/HeroBetaPill';
import { HeroBackground } from '~/components/landing/sections/hero/HeroBackground';
import { HeroSection } from '~/components/landing/sections/hero/HeroSection';
import { useLocale } from '~/test/utils/landing-i18n';

function withRouter(node: React.ReactNode) {
  return <MemoryRouter initialEntries={['/en']}>{node}</MemoryRouter>;
}

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })),
  });
}

let restore: (() => Promise<void>) | null = null;

afterEach(async () => {
  vi.restoreAllMocks();
  if (restore) {
    await restore();
    restore = null;
  }
});

describe('HeroBetaPill', () => {
  it('renders pill label text', () => {
    render(<HeroBetaPill>v0.9 · public beta</HeroBetaPill>);
    expect(screen.getByText(/v0.9 · public beta/)).toBeInTheDocument();
  });

  it('shows a live dot indicator', () => {
    render(<HeroBetaPill>x</HeroBetaPill>);
    expect(screen.getByTestId('hero-beta-pill-dot')).toBeInTheDocument();
  });
});

describe('HeroBackground (route)', () => {
  it('renders an SVG when kind="route"', () => {
    const { container } = render(<HeroBackground kind="route" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders nothing when kind="none"', () => {
    const { container } = render(<HeroBackground kind="none" />);
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('HeroSection', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  it('renders the gradient-split headline', () => {
    render(withRouter(<HeroSection />));
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Train with intent/i)).toBeInTheDocument();
    expect(screen.getByText('Together.')).toBeInTheDocument();
  });

  it('renders dual coach / athlete CTAs', () => {
    render(withRouter(<HeroSection />));
    expect(screen.getByRole('link', { name: /coach/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /athlete/i })).toBeInTheDocument();
  });

  it('shows three meta items (no Strava)', () => {
    render(withRouter(<HeroSection />));
    const meta = screen.getByTestId('hero-meta');
    expect(meta.textContent?.toLowerCase()).not.toContain('strava');
    expect(meta.children.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the WeekGridMock on wide viewport', () => {
    stubMatchMedia(false);
    render(withRouter(<HeroSection />));
    expect(screen.getByTestId('week-grid-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-week-view-mock')).not.toBeInTheDocument();
  });

  it('renders the MobileWeekViewMock on compact viewport', () => {
    stubMatchMedia(true);
    render(withRouter(<HeroSection />));
    expect(screen.getByTestId('mobile-week-view-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('week-grid-mock')).not.toBeInTheDocument();
  });

  it('localizes Polish hero content', async () => {
    restore = await useLocale('pl');
    render(withRouter(<HeroSection />));
    expect(screen.getByText(/Trenuj z głową/)).toBeInTheDocument();
    expect(screen.getByText('Razem.')).toBeInTheDocument();
  });
});
