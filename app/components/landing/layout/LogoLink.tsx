import { useId } from 'react';
import { cn } from '~/lib/utils';

interface LogoLinkProps {
  size?: number;
  className?: string;
  title?: string;
}

export function LogoLink({ size = 22, className, title = 'SYNEK' }: LogoLinkProps) {
  const gradId = useId();
  return (
    <svg
      role="img"
      aria-label={title}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('flex-none', className)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--grad-a)" />
          <stop offset="55%" stopColor="var(--grad-b)" />
          <stop offset="100%" stopColor="var(--grad-c)" />
        </linearGradient>
      </defs>
      <rect
        x="2.5"
        y="6"
        width="11"
        height="11"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="2"
      />
      <rect
        x="10.5"
        y="6"
        width="11"
        height="11"
        rx="3"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
      />
    </svg>
  );
}
