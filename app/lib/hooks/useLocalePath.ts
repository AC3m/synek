import { useParams } from 'react-router';

/**
 * Returns a helper that prefixes a path with the current locale segment.
 * Falls back to 'pl' when used outside a locale route (e.g. on /login).
 */
export function useLocalePath() {
  const { locale = 'pl' } = useParams<{ locale?: string }>();
  return (path: string) => `/${locale}${path}`;
}
