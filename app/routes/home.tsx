import { Navigate } from 'react-router';
import { useAuth } from '~/lib/context/AuthContext';

export function meta() {
  return [
    { title: 'Training Planner' },
    { name: 'description', content: 'Fitness coach-athlete training planner' },
  ];
}

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) return <Navigate to="/login" replace />;

  const target = user.role === 'coach' ? '/coach' : '/athlete';
  return <Navigate to={target} replace />;
}
