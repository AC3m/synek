import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogoLink } from '~/components/landing/layout/LogoLink';
import { Logo, LogoMark } from '~/components/shared/Logo';

describe('LogoMark (via LogoLink re-export)', () => {
  it('exposes the SYNEK accessible name', () => {
    render(<LogoLink />);
    expect(screen.getByRole('img', { name: /synek/i })).toBeInTheDocument();
  });

  it('renders two interlocked squares', () => {
    const { container } = render(<LogoLink />);
    const squares = container.querySelectorAll('span[aria-hidden="true"]');
    expect(squares.length).toBe(2);
  });

  it('applies extra className when provided', () => {
    render(<LogoLink className="extra-class" />);
    expect(screen.getByRole('img', { name: /synek/i }).className).toContain('extra-class');
  });

  it('renders named size sm without error', () => {
    render(<LogoMark size="sm" />);
    expect(screen.getByRole('img', { name: /synek/i })).toBeInTheDocument();
  });

  it('renders named size lg without error', () => {
    render(<LogoMark size="lg" />);
    expect(screen.getByRole('img', { name: /synek/i })).toBeInTheDocument();
  });
});

describe('Logo', () => {
  it('renders wordmark by default', () => {
    render(<Logo />);
    expect(screen.getByText('SYNEK')).toBeInTheDocument();
  });

  it('hides wordmark when showWordmark=false', () => {
    render(<Logo showWordmark={false} />);
    expect(screen.queryByText('SYNEK')).not.toBeInTheDocument();
  });

  it('still renders mark when wordmark hidden', () => {
    render(<Logo showWordmark={false} />);
    expect(screen.getByRole('img', { name: /synek/i })).toBeInTheDocument();
  });
});
