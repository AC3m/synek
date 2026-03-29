import { useAuth } from '~/lib/context/AuthContext';
import { GoalListView } from '~/components/goals/GoalListView';

export default function CoachGoals() {
  const { user, effectiveAthleteId } = useAuth();
  const athleteId = effectiveAthleteId ?? user?.id ?? '';
  return (
    <GoalListView
      athleteId={athleteId}
      createdBy={user?.id ?? ''}
      canManage={true}
    />
  );
}
