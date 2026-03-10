import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/lib/context/AuthContext';
import {
  useUpdateProfileName,
  useUploadAvatar,
  useChangePassword,
  useSelfPlanPermission,
  useUpdateSelfPlanPermission,
} from '~/lib/hooks/useProfile';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { Switch } from '~/components/ui/switch';
import { DeleteAccountDialog } from '~/components/settings/DeleteAccountDialog';
import { cn } from '~/lib/utils';

interface UserTabProps {
  className?: string;
}

export function UserTab({ className }: UserTabProps) {
  const { t } = useTranslation('common');
  const { t: tAthlete } = useTranslation('athlete');
  const { user } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateName = useUpdateProfileName();
  const uploadAvatar = useUploadAvatar();
  const changePassword = useChangePassword();
  const { data: canSelfPlan = true } = useSelfPlanPermission(
    user?.role === 'athlete' ? (user?.id ?? '') : ''
  );
  const updateSelfPlan = useUpdateSelfPlanPermission();

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await updateName.mutateAsync(name.trim());
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return; // 5 MB guard
    await uploadAvatar.mutateAsync(file);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError(t('settings.user.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.user.passwordMismatch'));
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setPasswordError(
        msg === 'wrong_password' ? t('settings.user.wrongPassword') : t('errors.generic')
      );
    }
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Name */}
      <form onSubmit={handleSaveName} className="space-y-2">
        <label className="text-sm font-medium">{t('settings.user.name')}</label>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" disabled={updateName.isPending}>
            {nameSaved ? t('settings.user.saved') : t('settings.user.saveChanges')}
          </Button>
        </div>
      </form>

      <Separator />

      {/* Avatar */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('settings.user.avatar')}</label>
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
              {user?.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
            >
              {uploadAvatar.isPending ? '…' : t('actions.edit')}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">{t('settings.user.avatarHint')}</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <Separator />

      {/* Password */}
      <form onSubmit={handleChangePassword} className="space-y-3">
        <h3 className="text-sm font-medium">{t('settings.user.changePassword')}</h3>
        <div className="max-w-sm space-y-2">
          <Input
            type="password"
            placeholder={t('settings.user.currentPassword')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            type="password"
            placeholder={t('settings.user.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder={t('settings.user.confirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
        <Button type="submit" disabled={changePassword.isPending}>
          {passwordSaved ? t('settings.user.saved') : t('settings.user.changePassword')}
        </Button>
      </form>

      {user?.role === 'athlete' && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{tAthlete('selfPlan.label')}</p>
                <p className="text-xs text-muted-foreground">{tAthlete('selfPlan.hint')}</p>
              </div>
              <Switch
                checked={canSelfPlan}
                onCheckedChange={(value) =>
                  updateSelfPlan.mutate({ athleteId: user.id, value })
                }
              />
            </div>
          </div>
        </>
      )}

      <Separator className="my-8" />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-destructive">
          {t('settings.deleteAccount.dangerZone')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('settings.deleteAccount.description')}
        </p>
        <DeleteAccountDialog />
      </div>
    </div>
  );
}
