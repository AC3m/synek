import { useId } from 'react';

export type HeroBackgroundKind = 'route' | 'none';

interface HeroBackgroundProps {
  kind: HeroBackgroundKind;
}

export function HeroBackground({ kind }: HeroBackgroundProps) {
  if (kind === 'none') return null;
  return <RouteBackground />;
}

function RouteBackground() {
  const gradId = useId();
  const glowId = useId();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-80 motion-reduce:opacity-50"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--grad-a-rgb))" />
            <stop offset="50%" stopColor="rgb(var(--grad-b-rgb))" />
            <stop offset="100%" stopColor="rgb(var(--grad-c-rgb))" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="0.7" />
          </filter>
        </defs>
        <path
          d="M -10 70 Q 10 30, 25 55 T 50 60 T 75 40 T 110 50"
          stroke={`url(#${gradId})`}
          strokeWidth="0.85"
          fill="none"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
          className="motion-safe:[animation:landing-route-draw_14s_linear_infinite] motion-safe:[stroke-dasharray:60_240]"
        />
        <path
          d="M -10 70 Q 10 30, 25 55 T 50 60 T 75 40 T 110 50"
          stroke={`url(#${gradId})`}
          strokeWidth="0.3"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M -10 22 Q 18 50, 32 28 T 60 36 T 90 18 T 115 30"
          stroke={`url(#${gradId})`}
          strokeWidth="0.55"
          fill="none"
          strokeLinecap="round"
          opacity="0.45"
          filter={`url(#${glowId})`}
        />
      </svg>
      <style>{`@keyframes landing-route-draw {
        from { stroke-dashoffset: 300; }
        to { stroke-dashoffset: 0; }
      }`}</style>
    </div>
  );
}
