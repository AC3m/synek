import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { GradientButton } from './GradientButton';
import { Link } from 'react-router';
import { cn } from '~/lib/utils';

interface CtaSpec {
  label: string;
  to: string;
}

interface CtaButtonPairProps {
  primary: CtaSpec;
  secondary: CtaSpec;
  meta?: ReactNode;
  size?: 'md' | 'lg';
  className?: string;
}

export function CtaButtonPair({
  primary,
  secondary,
  meta,
  size = 'lg',
  className,
}: CtaButtonPairProps) {
  return (
    <div className={cn('flex flex-col items-stretch gap-3 sm:flex-row sm:items-center', className)}>
      <GradientButton to={primary.to} size={size}>
        {primary.label}
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </GradientButton>

      <Link
        to={secondary.to}
        className={cn(
          'group inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] font-semibold hover:border-white/30 hover:bg-white/[0.07]',
          size === 'lg' ? 'h-12 px-6 text-[14.5px]' : 'h-10 px-5 text-[13.5px]',
        )}
      >
        {secondary.label}
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </Link>

      {meta ? <div data-testid="cta-meta">{meta}</div> : null}
    </div>
  );
}
