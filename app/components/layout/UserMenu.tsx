import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import { Button } from '~/components/ui/button';

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const roleLabel = user.role === 'coach' ? t('roles.coach') : t('roles.athlete');

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        <span>
          {user.name}{' '}
          <span className="text-xs text-muted-foreground/70">({roleLabel})</span>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('auth.signOut')}</span>
      </Button>
    </div>
  );
}
