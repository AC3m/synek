import { LogOut, Settings, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import { useLocalePath } from '~/lib/hooks/useLocalePath';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Button } from '~/components/ui/button';

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const localePath = useLocalePath();
  const { locale = 'pl' } = useParams<{ locale?: string }>();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate(`/${locale}/login`, { replace: true });
  }

  const roleLabel = user.role === 'coach' ? t('roles.coach') : t('roles.athlete');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <User className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {user.name} <span className="text-xs text-muted-foreground/70">({roleLabel})</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(localePath('/settings'))}>
          <Settings className="mr-2 h-4 w-4" />
          {t('settings.title')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
