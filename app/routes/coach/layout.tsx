import { Navigate, Outlet } from 'react-router';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import { AthletePicker } from '~/components/coach/AthletePicker';
import { Button } from '~/components/ui/button';

export default function CoachLayout() {
  const { user, isLoading, selectedAthleteId, athletes, clearSelectedAthlete } =
    useAuth();
  const { t } = useTranslation('coach');

  if (isLoading) return null;

  // FR-004: Unauthenticated → login
  if (!user) return <Navigate to="/login" replace />;

  // FR-005: Athletes cannot access coach routes
  if (user.role !== 'coach') return <Navigate to="/athlete" replace />;

  // FR-007: Coach must select an athlete before seeing the workspace
  if (!selectedAthleteId) {
    return <AthletePicker />;
  }

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);

  return (
    <div className="space-y-4">
      {/* Athlete context banner */}
      {selectedAthlete && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('managing')}</span>
            <span className="font-medium">{selectedAthlete.name}</span>
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
      )}
      <Outlet />
    </div>
  );
}
