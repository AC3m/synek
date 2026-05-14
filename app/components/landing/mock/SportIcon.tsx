import { SPORT_COLORS, type Sport } from './sports';

interface SportIconProps {
  sport: Sport;
  size?: number;
  className?: string;
}

export function SportIcon({ sport, size = 14, className }: SportIconProps) {
  const c = SPORT_COLORS[sport];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      style={{ color: c.fg, flex: 'none' }}
    >
      {sport === 'run' && (
        <path
          d="M13 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-2.2 5.6L8.4 12l1.4 2 .8 6h2l-.6-5.4 2-1.6 1.6 3 3 1 .4-1.8-2.4-.8-1.6-3-2.4-2-2-.8-1.8 1Z"
          fill="currentColor"
        />
      )}
      {sport === 'cycling' && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="5.5" cy="17" r="3.2" />
          <circle cx="18.5" cy="17" r="3.2" />
          <path d="M5.5 17 11 9h4l3.5 8M14 5h2.5" />
        </g>
      )}
      {sport === 'swimming' && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 17c2 1.4 3 1.4 5 0s3-1.4 5 0 3 1.4 5 0 3-1.4 5 0" />
          <path d="M2 13c2 1.4 3 1.4 5 0s3-1.4 5 0" />
          <circle cx="16" cy="7" r="1.6" />
          <path d="M9 13l5-4 3 2" />
        </g>
      )}
      {sport === 'strength' && (
        <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 10v4M6 7v10M18 7v10M21 10v4" />
          <path d="M9 8v8M15 8v8" />
          <path d="M9 12h6" />
        </g>
      )}
      {sport === 'mobility' && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="5" r="1.8" />
          <path d="M12 8v5m0 0-3 7m3-7 3 7M8 11h8" />
        </g>
      )}
      {sport === 'rest' && (
        <path d="M9 4c0 4 3 6 7 6-1 5-5 9-10 9-3 0-5-2-5-5 0-5 4-10 8-10Z" fill="currentColor" />
      )}
    </svg>
  );
}
