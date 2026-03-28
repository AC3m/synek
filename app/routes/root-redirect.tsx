import { Navigate } from 'react-router';
import { useAuth } from '~/lib/context/AuthContext';
import { getCurrentWeekId } from '~/lib/utils/date';

export default function RootRedirect() {
  const { user, isLoading } = useAuth();
  const locale = localStorage.getItem('locale') ?? 'pl';

  if (isLoading) return null; // GlobalLoader in root.tsx covers this
  if (!user) return <Navigate to={`/${locale}`} replace />;
  return <Navigate to={`/${locale}/${user.role}/week/${getCurrentWeekId()}`} replace />;
}
