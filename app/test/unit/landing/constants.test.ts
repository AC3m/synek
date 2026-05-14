import { describe, expect, it } from 'vitest';
import {
  LANDING_ACCENT,
  LANDING_ACCENT_RGB,
  LANDING_BREAKPOINTS,
} from '~/components/landing/constants';

function hexToRgbString(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

describe('landing constants', () => {
  it('locks emerald accent palette', () => {
    expect(LANDING_ACCENT.a.toLowerCase()).toBe('#10b981');
    expect(LANDING_ACCENT.b.toLowerCase()).toBe('#059669');
    expect(LANDING_ACCENT.c.toLowerCase()).toBe('#047857');
  });

  it('RGB triples match hex values', () => {
    expect(LANDING_ACCENT_RGB.a).toBe(hexToRgbString(LANDING_ACCENT.a));
    expect(LANDING_ACCENT_RGB.b).toBe(hexToRgbString(LANDING_ACCENT.b));
    expect(LANDING_ACCENT_RGB.c).toBe(hexToRgbString(LANDING_ACCENT.c));
  });

  it('exposes mobile/tablet/desktop breakpoints', () => {
    expect(LANDING_BREAKPOINTS.mobile).toBeLessThan(LANDING_BREAKPOINTS.tablet);
    expect(LANDING_BREAKPOINTS.tablet).toBeLessThan(LANDING_BREAKPOINTS.desktop);
  });
});
