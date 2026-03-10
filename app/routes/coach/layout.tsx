import { Navigate, Outlet, useParams } from 'react-router';
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

  if (isLoading) return null;

  // FR-004: Unauthenticated → login
  if (!user) return <Navigate to="/login" replace />;

  // FR-005: Athletes cannot access coach routes
  if (user.role !== 'coach') return <Navigate to={`/${locale}/athlete`} replace />;

  // FR-007: Coach must select an athlete before seeing the workspace
  if (!selectedAthleteId) {
    return <AthletePicker />;
  }

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);

  return (
    <div className="space-y-4">
      {/* Athlete context banner */}
      {isViewingSelf ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <User className="h-4 w-4 text-primary" />
          <span className="font-medium text-primary">{t('myPlan')}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelectedAthlete}
            className="ml-auto h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            {t('switchAthlete')}
          </Button>
        </div>
      ) : selectedAthlete ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('managing')}</span>
            <span className="font-medium">{selectedAthlete.name}</span>
          </div>
          <div className="flex items-center gap-3">
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
                className="text-xs text-muted-foreground cursor-pointer"
              >
                {t('selfPlan.label')}
              </label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelectedAthlete}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
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
