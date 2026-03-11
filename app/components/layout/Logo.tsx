import { cn } from '~/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

const sizeMap = {
  sm: { mark: 'h-4 w-auto', text: 'text-xs tracking-[0.2em]' },
  md: { mark: 'h-6 w-auto', text: 'text-sm tracking-[0.25em]' },
  lg: { mark: 'h-10 w-auto', text: 'text-2xl tracking-[0.3em]' },
}

// "The Velocity Mark" — A more complex, advanced take on the three-stripe pacing motif.
// It uses sharp, forward-leaning paths with subtle rounded joints (nano-precision).
// The ascending silhouette reads as pace building / acceleration.
// The interlocking layout suggests mechanical synergy and "synch".
// 
// ViewBox "0 0 24 24"
// Stripe 1: Bottom left, shortest, lightest
// Stripe 2: Middle, mid-height
// Stripe 3: Top right, lead stripe, full height

export function Logo({ size = 'md', showWordmark = true, className }: LogoProps) {
  const s = sizeMap[size]
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        className={cn(s.mark, 'shrink-0')}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Trailing stripe — subtle, base-building */}
        <path
          d="M2 22.5L4.5 14H8.5L6 22.5H2Z"
          fill="currentColor"
          fillOpacity="0.25"
        />
        {/* Mid stripe — rhythm and tempo */}
        <path
          d="M9.5 22.5L12.5 8H16.5L13.5 22.5H9.5Z"
          fill="currentColor"
          fillOpacity="0.55"
        />
        {/* Lead stripe — the sprint / performance peak */}
        <path
          d="M17 22.5L20.5 1.5H24.5L21 22.5H17Z"
          fill="currentColor"
        />
      </svg>
      {showWordmark && (
        <span className={cn('font-black uppercase italic', s.text)}>SYNEK</span>
      )}
    </div>
  )
}
