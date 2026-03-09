import { useMutation } from '@tanstack/react-query';
import { useAuth } from '~/lib/context/AuthContext';
import { updateProfileName, uploadAvatar, changePassword } from '~/lib/queries/profile';

export function useUpdateProfileName() {
  const { user, updateProfile } = useAuth();

  return useMutation({
    mutationFn: (name: string) => {
      if (!user) throw new Error('not_authenticated');
      return updateProfileName(user.id, name);
    },
    onMutate: (name) => {
      if (user) updateProfile(name, user.avatarUrl);
    },
    onError: () => {
      // Rollback handled by refetching profile on next auth state change;
      // for mock mode the optimistic update is close enough.
    },
  });
}

export function useUploadAvatar() {
  const { user, updateProfile } = useAuth();

  return useMutation({
    mutationFn: (file: File) => {
      if (!user) throw new Error('not_authenticated');
      return uploadAvatar(user.id, file);
    },
    onSuccess: (avatarUrl) => {
      if (user) updateProfile(user.name, avatarUrl);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
  });
}
