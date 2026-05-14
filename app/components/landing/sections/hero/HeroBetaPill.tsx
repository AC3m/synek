import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

interface HeroBetaPillProps {
  children: ReactNode;
  className?: string;
}

export function HeroBetaPill({ children, className }: HeroBetaPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-wide',
        className,
      )}
    >
      <span
        data-testid="hero-beta-pill-dot"
        className="relative inline-flex h-1.5 w-1.5"
        aria-hidden="true"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      {children}
    </span>
  );
}
