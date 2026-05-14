import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { JoinBetaSection } from '~/components/landing/sections/join-beta/JoinBetaSection';
import { ContactSection } from '~/components/landing/sections/contact/ContactSection';
import { LandingFooter } from '~/components/landing/layout/LandingFooter';
import { useLocale } from '~/test/utils/landing-i18n';

function wrap(node: React.ReactNode) {
  return <MemoryRouter initialEntries={['/en']}>{node}</MemoryRouter>;
}

let restore: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (restore) {
    await restore();
    restore = null;
  }
});

describe('JoinBetaSection', () => {
  it('renders eyebrow, heading and lede', () => {
    render(wrap(<JoinBetaSection />));
    expect(screen.getByText(/join the beta/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders coach + athlete CTAs', () => {
    render(wrap(<JoinBetaSection />));
    expect(screen.getByRole('link', { name: /coach/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /athlete/i })).toBeInTheDocument();
  });

  it('renders 3 fineprint items', () => {
    render(wrap(<JoinBetaSection />));
    expect(screen.getAllByTestId('fineprint-item')).toHaveLength(3);
  });

  it('localizes (PL)', async () => {
    restore = await useLocale('pl');
    render(wrap(<JoinBetaSection />));
    expect(screen.getByText(/Trenuj z głową/i)).toBeInTheDocument();
  });
});

describe('ContactSection', () => {
  it('renders heading, role toggle (coach default), and form fields', () => {
    render(<ContactSection />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coach/i }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('switches role state when athlete pill is clicked', async () => {
    const user = userEvent.setup();
    render(<ContactSection />);
    await user.click(screen.getByRole('button', { name: /athlete/i }));
    expect(screen.getByRole('button', { name: /athlete/i }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: /^coach$/i }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('shows success message after submitting a valid form', async () => {
    const user = userEvent.setup();
    render(<ContactSection />);
    await user.type(screen.getByLabelText(/name/i), 'Sara');
    await user.type(screen.getByLabelText(/email/i), 'sara@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Hello!');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(await screen.findByText(/got it/i)).toBeInTheDocument();
  });
});

describe('LandingFooter', () => {
  it('renders brand and link entries', () => {
    render(wrap(<LandingFooter />));
    expect(screen.getByText('SYNEK')).toBeInTheDocument();
    expect(screen.getAllByRole('link').length).toBeGreaterThanOrEqual(5);
  });

  it('shows copyright meta', () => {
    render(wrap(<LandingFooter />));
    expect(screen.getByText(/©\s*2026/)).toBeInTheDocument();
  });
});
