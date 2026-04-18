import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { LandingNav } from '~/components/landing/LandingNav';
import type { UserRole } from '~/lib/auth';

export default function SelectRolePage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { locale = 'pl' } = useParams<{ locale: string }>();
  const { confirmRole } = useAuth();

  const [isPending, setIsPending] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  async function handleSelectRole(role: UserRole) {
    setSelectedRole(role);
    setIsPending(true);
    try {
      await confirmRole(role);
      navigate(`/${locale}/${role}`, { replace: true });
    } finally {
      setIsPending(false);
      setSelectedRole(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main className="flex min-h-screen items-center justify-center px-4 pt-14">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{t('auth.selectRoleTitle')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('auth.selectRoleBody')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(['coach', 'athlete'] as const).map((role) => (
              <button
                key={role}
                type="button"
                data-testid={`role-btn-${role}`}
                disabled={isPending}
                onClick={() => handleSelectRole(role)}
                className={cn(
                  'rounded-xl border px-4 py-6 text-sm font-medium transition-colors',
                  selectedRole === role
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted',
                  isPending && 'cursor-not-allowed opacity-50',
                )}
              >
                {role === 'coach' ? t('roles.coach') : t('roles.athlete')}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
