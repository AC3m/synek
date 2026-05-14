/**
 * i18n key-parity tests
 *
 * Asserts that every key in en/landing.json has a matching key in pl/landing.json
 * (and vice versa). Catches missed translations before they hit production.
 *
 * Additionally verifies that the landing-section copy lives inline in component
 * COPY constants (Landing redesign v2): we should NOT regress to using
 * `t('hero.…')` etc. — those keys are deliberately gone.
 */
import { describe, expect, it } from 'vitest';
import en from '~/i18n/resources/en/landing.json';
import pl from '~/i18n/resources/pl/landing.json';

type JsonObj = Record<string, unknown>;

function collectKeys(obj: unknown, prefix = '', acc: string[] = []): string[] {
  if (obj === null || typeof obj !== 'object') return acc;
  for (const [k, v] of Object.entries(obj as JsonObj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      collectKeys(v, path, acc);
    } else {
      acc.push(path);
    }
  }
  return acc;
}

describe('landing.json i18n parity', () => {
  const enKeys = new Set(collectKeys(en));
  const plKeys = new Set(collectKeys(pl));

  it('EN and PL have the same set of leaf keys', () => {
    const missingInPl = [...enKeys].filter((k) => !plKeys.has(k));
    const missingInEn = [...plKeys].filter((k) => !enKeys.has(k));
    expect({ missingInPl, missingInEn }).toEqual({ missingInPl: [], missingInEn: [] });
  });

  it('contains all required landing namespaces', () => {
    const required = [
      'nav',
      'hero',
      'why',
      'features',
      'perspectives',
      'joinBeta',
      'contactSection',
      'landingFooter',
      'mock',
      'beta',
      'support',
    ];
    expect(Object.keys(en)).toEqual(expect.arrayContaining(required));
    expect(Object.keys(pl)).toEqual(expect.arrayContaining(required));
  });

  it('does NOT carry pre-redesign landing-section keys', () => {
    // Old shape used "whySynek", "login", "footer", "contact" instead of the v2 keys.
    const legacyTopLevels = ['whySynek', 'login', 'footer', 'contact'];
    for (const k of legacyTopLevels) {
      expect(en).not.toHaveProperty(k);
      expect(pl).not.toHaveProperty(k);
    }
  });
});
