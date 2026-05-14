import { useEffect, useState } from 'react';

const COMPACT_QUERY = '(max-width: 767px)';

export function useIsCompactViewport(): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(COMPACT_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(COMPACT_QUERY);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari < 14 fallback
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return matches;
}
