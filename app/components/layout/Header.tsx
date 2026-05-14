import { Dumbbell, Trophy, BarChart3 } from 'lucide-react';
import { Link, NavLink, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { LogoLink } from '~/components/landing/LogoLink';
import { useAuth } from '~/lib/context/AuthContext';
import { useLocalePath } from '~/lib/hooks/useLocalePath';
import { cn } from '~/lib/utils';

const NAV_ITEMS = [
  { key: 'strength', icon: Dumbbell, path: (role: string | null) => `/${role}/strength` },
  { key: 'goals', icon: Trophy, path: (role: string | null) => `/${role}/goals` },
  { key: 'analytics', icon: BarChart3, path: (role: string | null) => `/${role}/analytics` },
] as const;

export function Header() {
  const { user } = useAuth();
  const { locale } = useParams<{ locale?: string }>();
  const { t } = useTranslation('common');
  const localePath = useLocalePath();
  const resolvedLocale = locale ?? localStorage.getItem('locale') ?? 'pl';
  const logoHref = user ? `/${resolvedLocale}/${user.role}` : '/';

  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to={logoHref} className="flex items-center gap-2">
            <LogoLink size={20} />
            <span className="text-xs font-black tracking-[0.2em] uppercase italic">SYNEK</span>
          </Link>
          {user && (
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map(({ key, icon: Icon, path }) => (
                <NavLink
                  key={key}
                  to={localePath(path(user.role))}
                  prefetch="intent"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/8 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(`nav.${key}` as never)}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">{user && <UserMenu />}</div>
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
