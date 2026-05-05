import { useAuth } from '~/lib/context/AuthContext';
import { useGoals } from '~/lib/hooks/useGoals';
import { AnalyticsView } from '~/components/analytics/AnalyticsView';

export default function CoachAnalytics() {
  const { user, effectiveAthleteId } = useAuth();
  const athleteId = effectiveAthleteId ?? user?.id ?? '';
  const { data: goals = [] } = useGoals(athleteId);

  return (
    <div className="space-y-6">
      <AnalyticsView namespace="coach" athleteId={athleteId} goals={goals} />
    </div>
  );
}
