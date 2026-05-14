import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

type Variant = 'default' | 'grad' | 'outline';

interface PillBadgeProps {
  children: ReactNode;
  variant?: Variant;
  dot?: boolean;
  as?: 'span' | 'p' | 'div';
  className?: string;
}

const VARIANT_CLASS: Record<Variant, string> = {
  default: 'border border-white/10 bg-white/[0.04] text-white/70',
  grad: 'landing-grad-text border border-emerald-500/20 bg-emerald-500/[0.06]',
  outline: 'border border-white/15 bg-transparent text-white/70',
};

export function PillBadge({
  children,
  variant = 'default',
  dot,
  as: As = 'span',
  className,
}: PillBadgeProps) {
  return (
    <As
      className={cn(
        'landing-mono inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.15em] uppercase',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </As>
  );
}
