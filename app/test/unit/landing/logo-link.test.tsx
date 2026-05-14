import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogoLink } from '~/components/landing/layout/LogoLink';

describe('LogoLink', () => {
  it('exposes the SYNEK accessible name', () => {
    render(<LogoLink />);
    expect(screen.getByRole('img', { name: /synek/i })).toBeInTheDocument();
  });

  it('renders an SVG of the requested size', () => {
    render(<LogoLink size={40} />);
    const svg = screen.getByRole('img', { name: /synek/i });
    expect(svg.getAttribute('width')).toBe('40');
    expect(svg.getAttribute('height')).toBe('40');
  });

  it('renders two interlocked rounded squares', () => {
    const { container } = render(<LogoLink />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(2);
  });

  it('uses the landing gradient (no inline hex literals)', () => {
    const { container } = render(<LogoLink />);
    const html = container.innerHTML;
    expect(html).toContain('url(#');
    expect(html).not.toMatch(/#10b981|#059669|#047857/i);
  });

  it('applies extra className when provided', () => {
    render(<LogoLink className="extra-class" />);
    expect(screen.getByRole('img', { name: /synek/i }).getAttribute('class')).toContain(
      'extra-class',
    );
  });
});
