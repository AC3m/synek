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
