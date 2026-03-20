import { Navigate, Outlet, useParams } from 'react-router';
import { AppLoader } from '~/components/ui/app-loader';
import { Users, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import { useSelfPlanPermission, useUpdateSelfPlanPermission } from '~/lib/hooks/useProfile';
import { AthletePicker } from '~/components/coach/AthletePicker';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';

export default function CoachLayout() {
  const { user, isLoading, selectedAthleteId, athletes, clearSelectedAthlete } =
    useAuth();
  const { t } = useTranslation('coach');
  const { locale = 'pl' } = useParams<{ locale?: string }>();

  const isViewingSelf = !!selectedAthleteId && selectedAthleteId === user?.id;
  const isViewingAthlete = !!selectedAthleteId && !isViewingSelf;

  const { data: canSelfPlan = true } = useSelfPlanPermission(
    isViewingAthlete ? selectedAthleteId : ''
  );
  const updateSelfPlan = useUpdateSelfPlanPermission();

  if (isLoading) return <AppLoader />;

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== 'coach') return <Navigate to={`/${locale}/athlete`} replace />;

  if (!selectedAthleteId) {
    return <AthletePicker />;
  }

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);

  return (
    <div className="space-y-4">
      {/* Athlete context banner */}
      {isViewingSelf ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 sm:px-4 text-sm">
          <User className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-medium text-primary truncate">{t('myPlan')}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelectedAthlete}
            className="ml-auto h-7 px-2 sm:px-3 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            {t('switchAthlete')}
          </Button>
        </div>
      ) : selectedAthlete ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-3 sm:px-4 sm:py-2">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground shrink-0">{t('managing')}</span>
            <span className="font-medium truncate">{selectedAthlete.name}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Switch
                id="self-plan-toggle"
                checked={canSelfPlan}
                onCheckedChange={(value) =>
                  updateSelfPlan.mutate({ athleteId: selectedAthleteId, value })
                }
              />
              <label
                htmlFor="self-plan-toggle"
                className="text-xs text-muted-foreground cursor-pointer shrink-0"
              >
                {t('selfPlan.label')}
              </label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelectedAthlete}
              className="h-7 px-2 sm:px-3 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              {t('switchAthlete')}
            </Button>
          </div>
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}
