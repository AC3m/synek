import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

interface BentoCardProps {
  icon?: ReactNode;
  title: ReactNode;
  body: ReactNode;
  span?: 2 | 3 | 4 | 6;
  rows?: 1 | 2;
  footer?: ReactNode;
  spotlight?: ReactNode;
  variant?: 'default' | 'wide';
  className?: string;
}

const SPAN_CLASS: Record<NonNullable<BentoCardProps['span']>, string> = {
  2: 'md:col-span-3 lg:col-span-2',
  3: 'md:col-span-3 lg:col-span-3',
  4: 'md:col-span-6 lg:col-span-4',
  6: 'md:col-span-6 lg:col-span-6',
};

export function BentoCard({
  icon,
  title,
  body,
  span = 2,
  rows = 1,
  footer,
  spotlight,
  variant = 'default',
  className,
}: BentoCardProps) {
  return (
    <article
      data-testid="bento-card"
      data-span={String(span)}
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-white/20',
        SPAN_CLASS[span],
        rows === 2 && 'lg:row-span-2',
        variant === 'wide' && 'lg:flex-row lg:items-center lg:gap-8',
        className,
      )}
    >
      <div className={cn('flex flex-col gap-3', variant === 'wide' && 'lg:flex-1')}>
        {icon ? (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] opacity-80">
            {icon}
          </span>
        ) : null}
        <h4 className="landing-display text-[18px] leading-tight">{title}</h4>
        <p className="text-[14.5px] leading-relaxed opacity-70">{body}</p>
        {footer ? <div className="mt-2">{footer}</div> : null}
      </div>
      {spotlight ? (
        <div
          className={cn(
            'relative mt-4 overflow-hidden rounded-xl border border-white/5 bg-black/30',
            rows === 2 && 'flex-1',
          )}
        >
          {spotlight}
        </div>
      ) : null}
    </article>
  );
}
