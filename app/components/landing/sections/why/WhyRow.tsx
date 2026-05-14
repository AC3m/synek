import type { ReactNode } from 'react';
import { useReveal } from '../../hooks/useReveal';
import { cn } from '~/lib/utils';

interface WhyRowProps {
  index: number;
  total: number;
  title: ReactNode;
  body: ReactNode;
  art: ReactNode;
  flip?: boolean;
}

export function WhyRow({ index, total, title, body, art, flip = false }: WhyRowProps) {
  const ref = useReveal<HTMLDivElement>();
  const badge = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  return (
    <div
      ref={ref}
      data-testid="why-row"
      data-flip={flip ? 'true' : 'false'}
      className={cn(
        'landing-reveal grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16',
        flip ? 'md:[&>[data-text]]:order-2' : null,
      )}
    >
      <div data-text className="flex flex-col gap-4">
        <span className="landing-mono text-[11px] tracking-[0.18em] uppercase opacity-50">
          {badge}
        </span>
        <h3 className="landing-display text-[28px] leading-[1.15] text-balance sm:text-[34px]">
          {title}
        </h3>
        <p className="text-[15.5px] leading-relaxed opacity-70">{body}</p>
      </div>
      <div className="relative h-[260px] sm:h-[320px]">{art}</div>
    </div>
  );
}
