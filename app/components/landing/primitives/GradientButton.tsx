import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '~/lib/utils';

type Size = 'sm' | 'md' | 'lg';

interface GradientButtonProps {
  children: ReactNode;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  size?: Size;
  className?: string;
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-10 px-5 text-[13.5px]',
  lg: 'h-12 px-6 text-[14.5px]',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--grad)] font-semibold text-white shadow-[0_8px_30px_-12px_rgba(16,185,129,0.6)] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none';

export function GradientButton({
  children,
  to,
  onClick,
  disabled,
  type = 'button',
  size = 'lg',
  className,
}: GradientButtonProps) {
  const cls = cn(BASE, SIZE_CLASS[size], className);

  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
