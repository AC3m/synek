import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Menu, X } from 'lucide-react'
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
  const [menuOpen, setMenuOpen] = useState(false)

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    setMenuOpen(false)
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  function resolveHref(href: string): string {
    return isLanding ? href : `/${href}`
  }

  function renderLink(link: NavLink, mobile = false) {
    const baseClass = mobile
      ? 'block py-2 text-base font-medium text-muted-foreground hover:text-foreground'
      : 'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'

    if (link.route) {
      return (
        <Link
          key={link.key}
          to={link.route}
          onClick={() => setMenuOpen(false)}
          className={cn(
            baseClass,
            link.key === 'joinBeta' && !mobile &&
              'rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
            link.key === 'joinBeta' && mobile &&
              'font-semibold text-primary hover:text-primary'
          )}
        >
          {t(`nav.${link.key}` as never)}
        </Link>
      )
    }

    if (isLanding) {
      return (
        <a
          key={link.key}
          href={link.href}
          onClick={(e) => handleNavClick(e, link.href!)}
          className={baseClass}
        >
          {t(`nav.${link.key}` as never)}
        </a>
      )
    }

    return (
      <Link
        key={link.key}
        to={resolveHref(link.href!)}
        onClick={() => setMenuOpen(false)}
        className={baseClass}
      >
        {t(`nav.${link.key}` as never)}
      </Link>
    )
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
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
            {NAV_LINKS.map((link) => renderLink(link))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>

        {/* Mobile: toggles + hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <LanguageToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t bg-background px-4 pb-4 md:hidden">
          <nav className="flex flex-col divide-y divide-border/50">
            {NAV_LINKS.map((link) => renderLink(link, true))}
          </nav>
        </div>
      )}
    </header>
  )
}
