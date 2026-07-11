import { Navigate, useSearchParams } from 'react-router';
import { isStandaloneMode } from '~/lib/utils/pwa';

export default function RootRedirect() {
  const [searchParams] = useSearchParams();
  const locale = localStorage.getItem('locale') ?? 'pl';

  // Admin-triggered auth emails (e.g. Supabase Dashboard "send recovery") don't carry a
  // redirectTo and always land here with the token in the URL — forward to the callback
  // route instead of the landing page so the link still works.
  if (searchParams.get('token_hash')) {
    return (
      <Navigate
        to={`/${locale}/auth/callback?${searchParams.toString()}${window.location.hash}`}
        replace
      />
    );
  }

  const target = isStandaloneMode() ? `/${locale}/home` : `/${locale}`;

  return <Navigate to={target} replace />;
}
