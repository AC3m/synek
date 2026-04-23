export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

let sessionStarted = false;

/**
 * Returns true only on the very first render of the PWA session (i.e. app
 * launched from home screen bookmark). Returns false for all subsequent
 * in-app navigations so redirect guards don't fire on every route change.
 */
export function isStaleBookmarkLoad(): boolean {
  if (!isStandaloneMode()) return false;
  if (sessionStarted) return false;
  sessionStarted = true;
  return true;
}
