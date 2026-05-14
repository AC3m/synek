import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

interface GradTextProps {
  children: ReactNode;
  className?: string;
  as?: 'span' | 'strong' | 'em';
}

export function GradText({ children, className, as: As = 'span' }: GradTextProps) {
  return <As className={cn('landing-grad-text', className)}>{children}</As>;
}
