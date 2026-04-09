import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { cn } from '~/lib/utils';
import { ThemeToggle } from '~/components/layout/ThemeToggle';
import { LanguageToggle } from '~/components/layout/LanguageToggle';
import { Logo } from '~/components/layout/Logo';

type AnchorLink = { key: string; href: string; route?: never };
type RouteLink = { key: string; routeKey: string; href?: never };
type NavLink = AnchorLink | RouteLink;

interface LandingNavProps {
  className?: string;
}

export function LandingNav({ className }: LandingNavProps) {
  const { t } = useTranslation('landing');
  const { pathname } = useLocation();
  const { locale = 'pl' } = useParams<{ locale: string }>();
  const [menuOpen, setMenuOpen] = useState(false);

  const MARKETING_LINKS: NavLink[] = [
    { key: 'getStarted', href: '#get-started' },
    { key: 'whySynek', href: '#why-synek' },
    { key: 'features', href: '#features' },
    { key: 'contact', href: '#contact' },
  ];

  const AUTH_LINKS: NavLink[] = [
    { key: 'logIn', routeKey: `/${locale}/login` },
    { key: 'joinBeta', routeKey: `/${locale}/register` },
  ];

  // Landing is at /:locale (only one path segment after root)
  const isLanding = pathname.split('/').filter(Boolean).length === 1;

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  }

  function resolveHref(href: string): string {
    return isLanding ? href : `/${href}`;
  }

  function renderMarketingLink(link: NavLink, mobile = false) {
    const baseClass = mobile
      ? 'block py-2 text-base font-medium text-muted-foreground hover:text-foreground'
      : 'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';

    if (isLanding && 'href' in link) {
      return (
        <a
          key={link.key}
          href={link.href}
          onClick={(e) => handleNavClick(e, link.href!)}
          className={baseClass}
        >
          {t(`nav.${link.key}` as never)}
        </a>
      );
    }

    const href = 'href' in link ? resolveHref(link.href!) : (link as RouteLink).routeKey;
    return (
      <Link key={link.key} to={href} onClick={() => setMenuOpen(false)} className={baseClass}>
        {t(`nav.${link.key}` as never)}
      </Link>
    );
  }

  function renderAuthLink(link: RouteLink, mobile = false) {
    if (mobile) {
      return (
        <Link
          key={link.key}
          to={link.routeKey}
          onClick={() => setMenuOpen(false)}
          className={cn(
            'block py-2 text-base font-medium',
            link.key === 'joinBeta'
              ? 'font-semibold text-primary hover:text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t(`nav.${link.key}` as never)}
        </Link>
      );
    }

    return (
      <Link
        key={link.key}
        to={link.routeKey}
        onClick={() => setMenuOpen(false)}
        className={cn(
          'text-sm font-medium transition-colors',
          link.key === 'joinBeta'
            ? 'rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90'
            : 'rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted',
        )}
      >
        {t(`nav.${link.key}` as never)}
      </Link>
    );
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b border-[color:var(--separator)] bg-surface-1/80 backdrop-blur-md',
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        {/* Logo */}
        <Logo size="sm" />

        {/* Desktop: marketing links centred (landing only), auth links + controls on far right */}
        <div className="hidden flex-1 items-center md:flex">
          {isLanding && (
            <nav className="ml-8 flex items-center gap-6">
              {MARKETING_LINKS.map((link) => renderMarketingLink(link))}
            </nav>
          )}

          {/* Pushes auth group to the far right */}
          <div className="ml-auto flex items-center gap-2">
            {/* Subtle separator */}
            <div className="mr-2 h-4 w-px bg-border" />
            {AUTH_LINKS.map((link) => renderAuthLink(link as RouteLink))}
            <div className="ml-2 flex items-center gap-1">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </div>

        {/* Mobile: toggles + hamburger */}
        <div className="ml-auto flex items-center gap-1 md:hidden">
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
        <div className="border-t border-[color:var(--separator)] bg-surface-1 px-4 pb-4 md:hidden">
          <nav className="flex flex-col divide-y divide-[color:var(--separator)]">
            {isLanding && MARKETING_LINKS.map((link) => renderMarketingLink(link, true))}
            {/* Auth links in their own group with a heavier divider */}
            <div className="flex flex-col gap-0 pt-2">
              {AUTH_LINKS.map((link) => renderAuthLink(link as RouteLink, true))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
