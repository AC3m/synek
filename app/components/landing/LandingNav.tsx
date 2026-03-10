import { useTranslation } from 'react-i18next'
import { Activity } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { cn } from '~/lib/utils'
import { ThemeToggle } from '~/components/layout/ThemeToggle'
import { LanguageToggle } from '~/components/layout/LanguageToggle'

type AnchorLink = { key: string; href: string; route?: never }
type RouteLink = { key: string; route: string; href?: never }
type NavLink = AnchorLink | RouteLink

const NAV_LINKS: NavLink[] = [
  { key: 'getStarted', href: '#get-started' },
  { key: 'whySynek', href: '#why-synek' },
  { key: 'features', href: '#features' },
  { key: 'logIn', route: '/login' },
  { key: 'joinBeta', route: '/register' },
  { key: 'contact', href: '#contact' },
]

interface LandingNavProps {
  className?: string
}

export function LandingNav({ className }: LandingNavProps) {
  const { t } = useTranslation('landing')
  const { pathname } = useLocation()
  const isLanding = pathname === '/'

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  function resolveHref(href: string): string {
    return isLanding ? href : `/${href}`
  }

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold">
          <Activity className="h-5 w-5 text-primary" />
          <span>Synek</span>
        </div>

        {/* Desktop nav + controls */}
        <div className="hidden items-center gap-6 md:flex">
          <nav className="flex items-center gap-6">
            {NAV_LINKS.map((link) =>
              link.route ? (
                <Link
                  key={link.key}
                  to={link.route}
                  className={cn(
                    'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                    link.key === 'joinBeta' &&
                      'rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  )}
                >
                  {t(`nav.${link.key}` as never)}
                </Link>
              ) : isLanding ? (
                <a
                  key={link.key}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href!)}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(`nav.${link.key}` as never)}
                </a>
              ) : (
                <Link
                  key={link.key}
                  to={resolveHref(link.href!)}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(`nav.${link.key}` as never)}
                </Link>
              )
            )}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>

        {/* Mobile: toggles right, nav scrolls left */}
        <div className="flex items-center gap-2 md:hidden">
          <nav className="flex items-center gap-4 overflow-x-auto">
            {NAV_LINKS.map((link) =>
              link.route ? (
                <Link
                  key={link.key}
                  to={link.route}
                  className="whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {t(`nav.${link.key}` as never)}
                </Link>
              ) : isLanding ? (
                <a
                  key={link.key}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href!)}
                  className="whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {t(`nav.${link.key}` as never)}
                </a>
              ) : (
                <Link
                  key={link.key}
                  to={resolveHref(link.href!)}
                  className="whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {t(`nav.${link.key}` as never)}
                </Link>
              )
            )}
          </nav>
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>
    </header>
  )
}
