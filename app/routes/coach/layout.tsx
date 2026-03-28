import { Navigate, Outlet, useParams } from 'react-router';
import { Users, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import { useSelfPlanPermission, useUpdateSelfPlanPermission } from '~/lib/hooks/useProfile';
import { AthletePicker } from '~/components/coach/AthletePicker';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';

export default function CoachLayout() {
  const { user, isLoading, selectedAthleteId, athletes, clearSelectedAthlete } = useAuth();
  const { t } = useTranslation('coach');
  const { locale = 'pl' } = useParams<{ locale?: string }>();

  const isViewingSelf = !!selectedAthleteId && selectedAthleteId === user?.id;
  const isViewingAthlete = !!selectedAthleteId && !isViewingSelf;

  const { data: canSelfPlan = true } = useSelfPlanPermission(
    isViewingAthlete ? selectedAthleteId : '',
  );
  const updateSelfPlan = useUpdateSelfPlanPermission();

  if (isLoading) return null; // GlobalLoader in root.tsx covers this
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
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm sm:px-4">
          <User className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate font-medium text-primary">{t('myPlan')}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelectedAthlete}
            className="ml-auto h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground sm:px-3"
          >
            {t('switchAthlete')}
          </Button>
        </div>
      ) : selectedAthlete ? (
        <div className="flex flex-col justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-3 sm:flex-row sm:items-center sm:px-4 sm:py-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="shrink-0 text-muted-foreground">{t('managing')}</span>
            <span className="truncate font-medium">{selectedAthlete.name}</span>
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
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
                className="shrink-0 cursor-pointer text-xs text-muted-foreground"
              >
                {t('selfPlan.label')}
              </label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelectedAthlete}
              className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground sm:px-3"
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
