import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PillBadge } from '~/components/landing/primitives/PillBadge';

describe('PillBadge', () => {
  it('renders children as text', () => {
    render(<PillBadge>Beta access</PillBadge>);
    expect(screen.getByText('Beta access')).toBeInTheDocument();
  });

  it('is a <span> by default', () => {
    const { container } = render(<PillBadge>x</PillBadge>);
    expect(container.querySelector('span')).not.toBeNull();
  });

  it('default variant has no gradient class', () => {
    const { container } = render(<PillBadge variant="default">x</PillBadge>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).not.toMatch(/grad/);
  });

  it('grad variant applies landing-grad-text class', () => {
    const { container } = render(<PillBadge variant="grad">x</PillBadge>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/landing-grad-text/);
  });

  it('shows dot indicator when dot=true', () => {
    const { container } = render(<PillBadge dot>x</PillBadge>);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('no dot indicator by default', () => {
    const { container } = render(<PillBadge>x</PillBadge>);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('accepts className', () => {
    const { container } = render(<PillBadge className="custom-pill">x</PillBadge>);
    expect(container.querySelector('.custom-pill')).not.toBeNull();
  });

  it('renders as <p> when as="p"', () => {
    const { container } = render(<PillBadge as="p">x</PillBadge>);
    expect(container.querySelector('p')).not.toBeNull();
  });
});
