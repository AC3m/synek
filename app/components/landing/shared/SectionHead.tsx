import type { ReactNode } from 'react';
import { Eyebrow } from './Eyebrow';
import { cn } from '~/lib/utils';

interface SectionHeadProps {
  eyebrow?: ReactNode;
  heading: ReactNode;
  lede?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHead({
  eyebrow,
  heading,
  lede,
  align = 'left',
  className,
}: SectionHeadProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="landing-display text-3xl leading-[1.1] sm:text-4xl md:text-5xl">{heading}</h2>
      {lede ? (
        <p
          className={cn(
            'text-base leading-relaxed opacity-70 sm:text-lg',
            align === 'center' && 'max-w-2xl',
          )}
        >
          {lede}
        </p>
      ) : null}
    </header>
  );
}
