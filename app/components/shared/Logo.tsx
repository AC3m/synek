import { cn } from '~/lib/utils';

const sizes = {
  sm: { container: 22, sq: 14, rx: 4, gap: 6, fontSize: 13 },
  md: { container: 28, sq: 18, rx: 5, gap: 8, fontSize: 16 },
  lg: { container: 44, sq: 28, rx: 8, gap: 11, fontSize: 26 },
} as const;

interface LogoMarkProps {
  size?: keyof typeof sizes;
  className?: string;
}

interface LogoProps {
  size?: keyof typeof sizes;
  showWordmark?: boolean;
  className?: string;
}

export function LogoMark({ size = 'md', className }: LogoMarkProps) {
  const s = sizes[size];
  return (
    <span
      role="img"
      aria-label="SYNEK"
      className={cn('relative inline-block flex-none', className)}
      style={{ width: s.container, height: s.container }}
    >
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          top: 0,
          left: 0,
          width: s.sq,
          height: s.sq,
          borderRadius: s.rx,
          background: 'color-mix(in oklab, currentColor 85%, transparent)',
          border: '1px solid color-mix(in oklab, currentColor 90%, transparent)',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          bottom: 0,
          right: 0,
          width: s.sq,
          height: s.sq,
          borderRadius: s.rx,
          background: 'var(--grad)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,.18) inset, 0 6px 18px -6px rgb(var(--grad-a-rgb) / .55)',
        }}
      />
    </span>
  );
}

export function Logo({ size = 'md', showWordmark = true, className }: LogoProps) {
  const s = sizes[size];
  return (
    <span className={cn('inline-flex items-center', className)} style={{ gap: s.gap }}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: s.fontSize,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          SYNEK
        </span>
      )}
    </span>
  );
}
