import { Logo } from '~/components/layout/Logo'

// Module-level timestamp so any remount offsets into the same animation cycle
const ANIMATION_START = Date.now();
const ANIMATION_DURATION_MS = 2000;

interface AppLoaderProps {
  className?: string;
}

export function AppLoader({ className }: AppLoaderProps) {
  const elapsed = Date.now() - ANIMATION_START;
  const delay = -(elapsed % ANIMATION_DURATION_MS);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-background ${className ?? ''}`}>
      <style>{`
        @keyframes app-loader-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.06); }
        }
      `}</style>
      <div style={{ animation: `app-loader-breathe ${ANIMATION_DURATION_MS}ms ease-in-out infinite`, animationDelay: `${delay}ms` }}>
        <Logo size="lg" showWordmark={true} />
      </div>
    </div>
  )
}
