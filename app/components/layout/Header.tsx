import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { useAuth } from '~/lib/context/AuthContext';

export function Header() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-semibold">{t('appName')}</span>
        </div>
        <div className="flex items-center gap-2">
          {user && <UserMenu />}
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
