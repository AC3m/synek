import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CtaButtonPair } from '~/components/landing/primitives/CtaButtonPair';

const defaultProps = {
  primary: { label: 'I am a coach', to: '/en/register' },
  secondary: { label: 'I am an athlete', to: '/en/login' },
};

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('CtaButtonPair', () => {
  it('renders both CTAs as links', () => {
    wrap(<CtaButtonPair {...defaultProps} />);
    expect(screen.getByRole('link', { name: 'I am a coach' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'I am an athlete' })).toBeInTheDocument();
  });

  it('primary link points to primary.to', () => {
    wrap(<CtaButtonPair {...defaultProps} />);
    expect(screen.getByRole('link', { name: 'I am a coach' }).getAttribute('href')).toBe(
      '/en/register',
    );
  });

  it('secondary link points to secondary.to', () => {
    wrap(<CtaButtonPair {...defaultProps} />);
    expect(screen.getByRole('link', { name: 'I am an athlete' }).getAttribute('href')).toBe(
      '/en/login',
    );
  });

  it('renders meta slot when provided', () => {
    wrap(<CtaButtonPair {...defaultProps} meta={<span>No credit card</span>} />);
    expect(screen.getByText('No credit card')).toBeInTheDocument();
  });

  it('no meta element when meta not provided', () => {
    const { container } = wrap(<CtaButtonPair {...defaultProps} />);
    expect(container.querySelector('[data-testid="cta-meta"]')).toBeNull();
  });

  it('stacks vertically on mobile (flex-col class)', () => {
    const { container } = wrap(<CtaButtonPair {...defaultProps} />);
    const wrapper = container.querySelector('[class*="flex-col"]');
    expect(wrapper).not.toBeNull();
  });
});
