import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '~/lib/context/AuthContext';
import {
  updateProfileName,
  uploadAvatar,
  changePassword,
  fetchSelfPlanPermission,
  updateSelfPlanPermission,
} from '~/lib/queries/profile';
import { queryKeys } from '~/lib/queries/keys';

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

export function useSelfPlanPermission(athleteId: string) {
  return useQuery({
    queryKey: queryKeys.selfPlan.byAthlete(athleteId),
    queryFn: () => fetchSelfPlanPermission(athleteId),
    enabled: !!athleteId,
  });
}

export function useUpdateSelfPlanPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ athleteId, value }: { athleteId: string; value: boolean }) =>
      updateSelfPlanPermission(athleteId, value),
    onMutate: async ({ athleteId, value }) => {
      await qc.cancelQueries({ queryKey: queryKeys.selfPlan.byAthlete(athleteId) });
      const prev = qc.getQueryData<boolean>(queryKeys.selfPlan.byAthlete(athleteId));
      qc.setQueryData(queryKeys.selfPlan.byAthlete(athleteId), value);
      return { prev, athleteId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(queryKeys.selfPlan.byAthlete(ctx.athleteId), ctx.prev);
      }
    },
    onSettled: (_data, _err, { athleteId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.selfPlan.byAthlete(athleteId) });
    },
  });
}
