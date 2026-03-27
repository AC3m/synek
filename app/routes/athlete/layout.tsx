import { Navigate, Outlet, useParams } from 'react-router';
import { useAuth } from '~/lib/context/AuthContext';
import { AppLoader } from '~/components/ui/app-loader';

export default function AthleteLayout() {
  const { user, isLoading } = useAuth();
  const { locale = 'pl' } = useParams<{ locale?: string }>();

  if (isLoading) return <AppLoader />;

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== 'athlete') return <Navigate to={`/${locale}/coach`} replace />;

  return <Outlet />;
}
