import { useAuth } from '~/lib/context/AuthContext';
import { useGoals } from '~/lib/hooks/useGoals';
import { AnalyticsView } from '~/components/analytics/AnalyticsView';

export default function AthleteAnalytics() {
  const { user } = useAuth();
  const athleteId = user?.id ?? '';
  const { data: goals = [] } = useGoals(athleteId);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AnalyticsView namespace="athlete" athleteId={athleteId} goals={goals} />
    </div>
  );
}
