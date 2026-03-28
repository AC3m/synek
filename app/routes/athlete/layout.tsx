import { Navigate, Outlet, useParams } from 'react-router';
import { useAuth } from '~/lib/context/AuthContext';

export default function AthleteLayout() {
  const { user, isLoading } = useAuth();
  const { locale = 'pl' } = useParams<{ locale?: string }>();

  if (isLoading) return null; // GlobalLoader in root.tsx covers this
  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== 'athlete') return <Navigate to={`/${locale}/coach`} replace />;

  return <Outlet />;
}
