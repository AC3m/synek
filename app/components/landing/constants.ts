export const LANDING_ACCENT = {
  a: '#10B981',
  b: '#059669',
  c: '#047857',
} as const;

export const LANDING_ACCENT_RGB = {
  a: '16, 185, 129',
  b: '5, 150, 105',
  c: '4, 120, 87',
} as const;

export const LANDING_BREAKPOINTS = {
  mobile: 390,
  tablet: 768,
  desktop: 1280,
} as const;

export interface SectionAnchor {
  readonly key: string;
  readonly href: string;
}

export const SECTIONS: readonly SectionAnchor[] = [
  { key: 'why', href: '#why' },
  { key: 'features', href: '#features' },
  { key: 'perspectives', href: '#perspectives' },
  { key: 'contact', href: '#contact' },
] as const;
