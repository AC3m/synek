import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BentoCard } from '~/components/landing/sections/features/BentoCard';
import { WeekBoardMini } from '~/components/landing/sections/features/WeekBoardMini';
import { PrivacyStrip } from '~/components/landing/sections/features/PrivacyStrip';
import { FeaturesSection } from '~/components/landing/sections/features/FeaturesSection';
import { Check } from 'lucide-react';
import { useLocale } from '~/test/utils/landing-i18n';

let restore: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (restore) {
    await restore();
    restore = null;
  }
});

describe('BentoCard', () => {
  it('renders icon, title and body', () => {
    render(<BentoCard icon={<Check data-testid="icon" />} title="Hello" body="World" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
  });

  it('exposes the span prop via data-span', () => {
    render(<BentoCard title="t" body="b" span={4} />);
    expect(screen.getByTestId('bento-card').dataset.span).toBe('4');
  });

  it('renders optional footer slot', () => {
    render(<BentoCard title="t" body="b" footer={<div data-testid="foot" />} />);
    expect(screen.getByTestId('foot')).toBeInTheDocument();
  });
});

describe('WeekBoardMini', () => {
  it('renders 21 grid cells', () => {
    render(<WeekBoardMini />);
    expect(screen.getAllByTestId('mini-cell')).toHaveLength(21);
  });

  it('marks at least one cell as filled with a label', () => {
    render(<WeekBoardMini />);
    const filled = screen.getAllByTestId('mini-cell').filter((el) => el.dataset.filled === 'true');
    expect(filled.length).toBeGreaterThan(0);
  });
});

describe('PrivacyStrip', () => {
  it('renders all 6 privacy tags', () => {
    render(<PrivacyStrip title="t" body="b" />);
    ['EU-HOSTED', 'GDPR', 'AES-256', 'EXPORT', 'NO ADS', 'NO MODEL TRAINING'].forEach((t) => {
      expect(screen.getByText(t)).toBeInTheDocument();
    });
  });

  it('renders title + body', () => {
    render(<PrivacyStrip title="Privacy" body="Yours." />);
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Yours.')).toBeInTheDocument();
  });
});

describe('FeaturesSection', () => {
  it('renders heading + lede', () => {
    render(<FeaturesSection />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders 6 bento cards', () => {
    render(<FeaturesSection />);
    expect(screen.getAllByTestId('bento-card')).toHaveLength(6);
  });

  it('does not show any Strava badge or text', () => {
    const { container } = render(<FeaturesSection />);
    expect(container.textContent?.toLowerCase()).not.toContain('strava');
    expect(container.textContent?.toLowerCase()).not.toContain('pending approval');
  });

  it('localizes content (PL)', async () => {
    restore = await useLocale('pl');
    render(<FeaturesSection />);
    expect(screen.getByText(/Sześć funkcji/i)).toBeInTheDocument();
  });
});
