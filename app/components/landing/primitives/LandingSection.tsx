import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

type MaxWidth = '5xl' | '6xl' | 'none';
type Padding = 'lg' | 'md' | 'none';

interface LandingSectionProps {
  children: ReactNode;
  id?: string;
  as?: 'section' | 'div' | 'article';
  maxWidth?: MaxWidth;
  padding?: Padding;
  className?: string;
  innerClassName?: string;
}

const MAX_W: Record<Exclude<MaxWidth, 'none'>, string> = {
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
};

const PADDING: Record<Padding, string> = {
  lg: 'px-5 py-24 sm:px-8',
  md: 'px-5 py-16 sm:px-8',
  none: '',
};

export function LandingSection({
  children,
  id,
  as: As = 'section',
  maxWidth = '6xl',
  padding = 'lg',
  className,
  innerClassName,
}: LandingSectionProps) {
  return (
    <As id={id} className={cn(PADDING[padding], className)}>
      {maxWidth === 'none' ? (
        children
      ) : (
        <div className={cn('mx-auto', MAX_W[maxWidth], innerClassName)}>{children}</div>
      )}
    </As>
  );
}
