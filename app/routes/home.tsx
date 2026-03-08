import { Navigate } from 'react-router';

export function meta() {
  return [
    { title: 'Training Planner' },
    { name: 'description', content: 'Fitness coach-trainee training planner' },
  ];
}

export default function Home() {
  return <Navigate to="/coach" replace />;
}
