import { useParams } from 'react-router';
import { StrengthLibraryView } from '~/components/strength/StrengthLibraryView';
import { useAuth } from '~/lib/context/AuthContext';
import { useSelfPlanPermission } from '~/lib/hooks/useProfile';

export default function AthleteStrengthLibrary() {
  const { locale = 'pl' } = useParams<{ locale?: string }>();
  const { user } = useAuth();
  const { data: canManage = false } = useSelfPlanPermission(user?.id ?? '');
  return (
    <StrengthLibraryView
      userId={user?.id ?? ''}
      canManage={canManage}
      baseRoute={`/${locale}/athlete/strength`}
    />
  );
}
