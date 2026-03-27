import { Dumbbell } from 'lucide-react';
import { Link, NavLink, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';
import { useAuth } from '~/lib/context/AuthContext';
import { useLocalePath } from '~/lib/hooks/useLocalePath';
import { cn } from '~/lib/utils';

export function Header() {
  const { user } = useAuth();
  const { locale } = useParams<{ locale?: string }>();
  const { t } = useTranslation('common');
  const localePath = useLocalePath();
  const resolvedLocale = locale ?? localStorage.getItem('locale') ?? 'pl';
  const logoHref = user ? `/${resolvedLocale}/${user.role}` : '/';

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--separator)] bg-surface-1/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to={logoHref} className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          {user && (
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink
                to={localePath(`/${user.role}/strength`)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <Dumbbell className="h-3.5 w-3.5" />
                {t('nav.strength')}
              </NavLink>
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
