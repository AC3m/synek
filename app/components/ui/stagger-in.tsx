import { cn } from '~/lib/utils'

interface StaggerInProps {
  delay?: number
  className?: string
  children: React.ReactNode
}

export function StaggerIn({ delay = 0, className, children }: StaggerInProps) {
  return (
    <div
      className={cn('animate-in fade-in slide-in-from-bottom-2 duration-500', className)}
      style={{
        animationFillMode: 'both',
        ...(delay > 0 && { animationDelay: `${delay}ms` }),
      }}
    >
      {children}
    </div>
  )
}
