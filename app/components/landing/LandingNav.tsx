import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { Menu, X } from 'lucide-react';
import { LogoLink } from './LogoLink';
import { LandingLangToggle } from './LandingLangToggle';
import { SECTIONS } from './shared/section-anchors';
import { useSmoothScroll } from './shared/useSmoothScroll';
import { cn } from '~/lib/utils';

export function LandingNav() {
  const { t } = useTranslation('landing');
  const { locale = 'pl' } = useParams<{ locale: string }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const smoothScroll = useSmoothScroll();

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    setMenuOpen(false);
    smoothScroll(e, href);
  }

  return (
    <header className="pt-safe fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[color-mix(in_oklab,var(--landing-bg)_75%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Link
          to={`/${locale}`}
          className="inline-flex items-center gap-2 text-[14px] font-semibold"
        >
          <LogoLink size={22} />
          SYNEK
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.key}
              href={s.href}
              onClick={(e) => smoothScroll(e, s.href)}
              className="text-[13.5px] opacity-70 hover:opacity-100"
            >
              {t(`nav.${s.key}` as never)}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block">
            <LandingLangToggle />
          </div>
          <Link
            to={`/${locale}/login`}
            className="hidden h-9 items-center justify-center rounded-md px-3 text-[13px] opacity-80 hover:opacity-100 md:inline-flex"
          >
            {t('nav.signin')}
          </Link>
          <Link
            to={`/${locale}/register`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[image:var(--grad)] px-3.5 text-[13px] font-semibold text-white"
          >
            {t('nav.getStarted')}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md md:hidden"
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="flex flex-col gap-1 border-t border-white/[0.06] px-5 py-4 md:hidden">
          {SECTIONS.map((s) => (
            <a
              key={s.key}
              href={s.href}
              onClick={(e) => handleNavClick(e, s.href)}
              className={cn('py-2 text-[14px] opacity-80 hover:opacity-100')}
            >
              {t(`nav.${s.key}` as never)}
            </a>
          ))}
          <Link
            to={`/${locale}/login`}
            onClick={() => setMenuOpen(false)}
            className="py-2 text-[14px] opacity-80"
          >
            {t('nav.signin')}
          </Link>
          <div className="mt-2">
            <LandingLangToggle />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
