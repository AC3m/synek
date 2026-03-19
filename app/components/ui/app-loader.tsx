import { Logo } from '~/components/layout/Logo'

interface AppLoaderProps {
  className?: string
}

export function AppLoader({ className }: AppLoaderProps) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-background ${className ?? ''}`}>
      <style>{`
        @keyframes app-loader-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.06); }
        }
      `}</style>
      <div style={{ animation: 'app-loader-breathe 2s ease-in-out infinite' }}>
        <Logo size="lg" showWordmark={true} />
      </div>
    </div>
  )
}
