import { Link, useParams } from 'react-router';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';
import { useAuth } from '~/lib/context/AuthContext';

export function Header() {
  const { user } = useAuth();
  const { locale } = useParams<{ locale?: string }>();
  const resolvedLocale = locale ?? localStorage.getItem('locale') ?? 'pl';
  const logoHref = user ? `/${resolvedLocale}/${user.role}` : '/';

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--separator)] bg-surface-1/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to={logoHref} className="flex items-center gap-2">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            {user && <UserMenu />}
          </div>
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
