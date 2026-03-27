// PoC: Junction Garmin integration — remove after evaluation
import { cn } from '~/lib/utils';

interface GarminBadgeProps {
  className?: string;
}

export function GarminBadge({ className }: GarminBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-semibold text-[#007CC3]',
        className,
      )}
    >
      {/* Garmin "G" logomark — simplified SVG based on brand identity */}
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
        <path d="M10 2a8 8 0 1 0 8 8h-8V8h5.93A6 6 0 1 1 10 4v-2Z" />
      </svg>
      Garmin
    </span>
  );
}
