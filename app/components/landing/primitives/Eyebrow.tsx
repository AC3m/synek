import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <span
      className={cn(
        'landing-eyebrow landing-mono inline-block text-[11px] font-medium tracking-[0.2em] uppercase opacity-60',
        className,
      )}
    >
      {children}
    </span>
  );
}
