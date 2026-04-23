import { useState, useEffect } from 'react';
import { X, Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { cn } from '~/lib/utils';
import { isStandaloneMode } from '~/lib/utils/pwa';

const STORAGE_KEY = 'pwa-install-dismissed';

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  return isIOS && isSafari;
}

export function InstallPrompt() {
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSSafari() || isStandaloneMode()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss when user returns from share sheet / home screen
  // (visibilitychange fires when they leave to add the icon and come back).
  // Also auto-dismiss after 30s as a fallback.
  useEffect(() => {
    if (!visible) return;

    let wasHidden = false;

    function onVisibilityChange() {
      if (document.hidden) {
        wasHidden = true;
      } else if (wasHidden) {
        dismiss();
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    const fallback = setTimeout(dismiss, 30_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(fallback);
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  }

  return (
    <div
      role="complementary"
      aria-label={t('install.ariaLabel')}
      className={cn(
        'fixed inset-x-4 z-50 md:hidden',
        // position above BottomNav (h-14 = 3.5rem) + safe area + 8px gap
        'bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.5rem)]',
        'flex items-center gap-3 rounded-xl px-4 py-3',
        'border border-[color:var(--separator)]',
        'bg-surface-2/95 shadow-lg backdrop-blur-md',
        'animate-in duration-300 ease-out fade-in slide-in-from-bottom-3',
      )}
    >
      <Logo size="sm" showWordmark={false} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight font-semibold text-foreground">{t('install.title')}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {t('install.instructionPre')}{' '}
          <Share className="inline h-3 w-3 align-[-1px]" aria-hidden="true" />{' '}
          {t('install.instructionPost')}
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label={t('actions.close')}
        className="-mr-1 flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
