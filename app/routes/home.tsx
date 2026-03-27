import { Navigate, useParams } from 'react-router';
import { AppLoader } from '~/components/ui/app-loader';
import { useAuth } from '~/lib/context/AuthContext';

export function meta() {
  return [
    { title: 'Training Planner' },
    { name: 'description', content: 'Fitness coach-athlete training planner' },
  ];
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const { locale = 'pl' } = useParams<{ locale?: string }>();

  if (isLoading) return <AppLoader />;

  if (!user) return <Navigate to={`/${locale}/login`} replace />;

  const target = user.role === 'coach' ? `/${locale}/coach` : `/${locale}/athlete`;
  return <Navigate to={target} replace />;
}
