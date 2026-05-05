import { Navigate } from 'react-router';
import { isStandaloneMode } from '~/lib/utils/pwa';

export default function RootRedirect() {
  const locale = localStorage.getItem('locale') ?? 'pl';
  const target = isStandaloneMode() ? `/${locale}/home` : `/${locale}`;

  return <Navigate to={target} replace />;
}
