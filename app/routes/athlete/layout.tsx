import { Navigate, Outlet } from 'react-router';
import { useAuth } from '~/lib/context/AuthContext';

export default function AthleteLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  // FR-004: Unauthenticated → login
  if (!user) return <Navigate to="/login" replace />;

  // FR-005: Coaches cannot access athlete routes
  if (user.role !== 'athlete') return <Navigate to="/coach" replace />;

  return <Outlet />;
}
