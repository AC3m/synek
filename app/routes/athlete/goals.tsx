import { useAuth } from '~/lib/context/AuthContext';
import { useSelfPlanPermission } from '~/lib/hooks/useProfile';
import { GoalListView } from '~/components/goals/GoalListView';

export default function AthleteGoals() {
  const { user } = useAuth();
  const { data: canManage = false } = useSelfPlanPermission(user?.id ?? '');
  return (
    <GoalListView
      athleteId={user?.id ?? ''}
      createdBy={user?.id ?? ''}
      canManage={canManage}
    />
  );
}
