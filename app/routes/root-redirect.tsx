import { Navigate } from 'react-router';

export default function RootRedirect() {
  const locale = localStorage.getItem('locale') ?? 'pl';
  return <Navigate to={`/${locale}`} replace />;
}
