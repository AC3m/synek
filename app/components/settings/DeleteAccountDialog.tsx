import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import { supabase } from '~/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

interface DeleteAccountDialogProps {
  className?: string;
}

export function DeleteAccountDialog({ className }: DeleteAccountDialogProps) {
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setStep(1);
      setConfirmInput('');
      setError(null);
      setIsPending(false);
    }
    setOpen(next);
  }

  async function handleDelete() {
    if (confirmInput !== user?.name) return;

    setError(null);
    setIsPending(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
      const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        setError(t('errors.generic'));
        setIsPending(false);
        return;
      }

      logout();
      navigate('/login', { replace: true });
    } catch {
      setError(t('errors.generic'));
      setIsPending(false);
    }
  }

  return (
    <div className={cn(className)}>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        {t('settings.deleteAccount.cta')}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('settings.deleteAccount.title')}</DialogTitle>
                <DialogDescription>{t('settings.deleteAccount.description')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  {t('actions.cancel')}
                </Button>
                <Button variant="destructive" onClick={() => setStep(2)}>
                  {t('settings.deleteAccount.confirmStep')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('settings.deleteAccount.title')}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <label htmlFor="confirm-username" className="text-sm leading-none font-medium">
                  {t('settings.deleteAccount.typeUsername')}
                </label>
                <Input
                  id="confirm-username"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={t('settings.deleteAccount.typeUsernamePlaceholder')}
                  autoComplete="off"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  {t('actions.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmInput !== user?.name || isPending}
                  onClick={handleDelete}
                >
                  {isPending
                    ? t('settings.deleteAccount.deleting')
                    : t('settings.deleteAccount.submit')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
