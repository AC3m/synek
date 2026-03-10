import { cn } from '~/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

const sizeMap = {
  sm: { mark: 'h-4 w-auto', text: 'text-sm tracking-[0.15em]' },
  md: { mark: 'h-5 w-auto', text: 'text-base tracking-[0.15em]' },
  lg: { mark: 'h-8 w-auto', text: 'text-2xl tracking-[0.15em]' },
}

// Three ascending forward-lean stripes — viewBox "0 0 20 16"
//
// All three parallelograms share the exact same lean angle (arctan(2/16) ≈ 7°).
// Height grows left→right: 8 → 12 → 16 px.
// Opacity builds left→right: 0.35 → 0.65 → 1.0.
//
// The ascending silhouette reads as pace building / acceleration.
// The uniform lean reads as disciplined forward drive.
// At sm (h-4, 16px rendered): shortest stripe is 8px — clearly legible.
// At lg (h-8, 32px rendered): all three stripes are crisp and bold.
//
// S1: points "0,16 1,8 4,8 3,16"      — 8px tall,  lean 1px, width 3px
// S2: points "7,16 8.5,4 11.5,4 10,16" — 12px tall, lean 1.5px, width 3px
// S3: points "14,16 16,0 19,0 17,16"   — 16px tall, lean 2px,  width 3px
// Gap between each stripe: 4px (consistent at bottom edge)

export function Logo({ size = 'md', showWordmark = true, className }: LogoProps) {
  const s = sizeMap[size]
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        className={cn(s.mark, 'shrink-0')}
        viewBox="0 0 20 16"
        fill="none"
        aria-hidden="true"
      >
        {/* Trailing stripe — shortest, lightest */}
        <polygon
          points="0,16 1,8 4,8 3,16"
          fill="currentColor"
          opacity="0.35"
        />
        {/* Mid stripe */}
        <polygon
          points="7,16 8.5,4 11.5,4 10,16"
          fill="currentColor"
          opacity="0.65"
        />
        {/* Lead stripe — full height, full opacity, the pace setter */}
        <polygon
          points="14,16 16,0 19,0 17,16"
          fill="currentColor"
        />
      </svg>
      {showWordmark && (
        <span className={cn('font-bold', s.text)}>SYNEK</span>
      )}
    </div>
  )
}
