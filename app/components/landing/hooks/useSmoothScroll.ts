import { useCallback } from 'react';

const NAV_OFFSET = 64;

export function useSmoothScroll() {
  return useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);
}
