import { supabase, isMockMode } from '~/lib/supabase';
import type { TrainingPreferences } from '~/types/preferences';

// ============================================================
// Mock state (in-memory, keyed by userId)
// ============================================================

const mockNames: Record<string, string> = {};
const mockAvatars: Record<string, string | null> = {};

// Self-plan permission mock store (default: true for all athletes)
const mockSelfPlan: Map<string, boolean> = new Map([
  ['athlete-1', true],
  ['athlete-2', true],
]);

export function resetMockSelfPlan(): void {
  mockSelfPlan.clear();
  mockSelfPlan.set('athlete-1', true);
  mockSelfPlan.set('athlete-2', true);
}

// ============================================================
// Update display name
// ============================================================

export async function mockUpdateProfileName(userId: string, name: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200));
  mockNames[userId] = name;
}

export async function updateProfileName(userId: string, name: string): Promise<void> {
  if (isMockMode) return mockUpdateProfileName(userId, name);
  const { error } = await supabase.from('profiles').update({ name }).eq('id', userId);
  if (error) throw error;
}

// ============================================================
// Upload avatar
// ============================================================

export async function mockUploadAvatar(_userId: string, _file: File): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  return 'https://api.dicebear.com/7.x/initials/svg?seed=mock';
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (isMockMode) return mockUploadAvatar(userId, file);

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  if (updateError) throw updateError;

  mockAvatars[userId] = publicUrl;
  return publicUrl;
}

// ============================================================
// Change password
// ============================================================

export async function mockChangePassword(
  _userId: string,
  currentPassword: string,
  _newPassword: string,
): Promise<void> {
  await new Promise((r) => setTimeout(r, 300));
  const validPasswords: Record<string, string> = {
    'coach-1': 'coach123',
    'athlete-1': 'alice123',
    'athlete-2': 'bob123',
  };
  // Mock validation by checking against known passwords by email convention
  const isValid = Object.values(validPasswords).includes(currentPassword);
  if (!isValid) throw new Error('wrong_password');
}

// ============================================================
// Self-plan permission
// ============================================================

export async function mockFetchSelfPlanPermission(athleteId: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 100));
  return mockSelfPlan.get(athleteId) ?? true;
}

export async function mockUpdateSelfPlanPermission(
  athleteId: string,
  value: boolean,
): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
  mockSelfPlan.set(athleteId, value);
}

export async function fetchSelfPlanPermission(athleteId: string): Promise<boolean> {
  if (isMockMode) return mockFetchSelfPlanPermission(athleteId);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, can_self_plan')
    .eq('id', athleteId)
    .maybeSingle();
  if (error) throw error;
  return data?.can_self_plan ?? true;
}

export async function updateSelfPlanPermission(athleteId: string, value: boolean): Promise<void> {
  if (isMockMode) return mockUpdateSelfPlanPermission(athleteId, value);
  const { error } = await supabase
    .from('profiles')
    .update({ can_self_plan: value })
    .eq('id', athleteId);
  if (error) throw error;
}

// ============================================================
// Training preferences
// ============================================================

let mockTrainingPreferences: Record<string, TrainingPreferences> = {};

export function resetMockTrainingPreferences(): void {
  mockTrainingPreferences = {};
}

export async function mockFetchTrainingPreferences(userId: string): Promise<TrainingPreferences> {
  await new Promise((r) => setTimeout(r, 100));
  return mockTrainingPreferences[userId] ?? { allowSetAdjustment: true };
}

export async function fetchTrainingPreferences(userId: string): Promise<TrainingPreferences> {
  if (isMockMode) return mockFetchTrainingPreferences(userId);
  const { data, error } = await supabase
    .from('profiles')
    .select('training_preferences')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.training_preferences as TrainingPreferences) ?? { allowSetAdjustment: true };
}

export async function mockUpdateTrainingPreferences(
  userId: string,
  input: Partial<TrainingPreferences>,
): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
  mockTrainingPreferences[userId] = {
    ...(mockTrainingPreferences[userId] ?? { allowSetAdjustment: true }),
    ...input,
  };
}

export async function updateTrainingPreferences(
  userId: string,
  input: Partial<TrainingPreferences>,
): Promise<void> {
  if (isMockMode) return mockUpdateTrainingPreferences(userId, input);
  const { error } = await supabase
    .from('profiles')
    .update({ training_preferences: input })
    .eq('id', userId);
  if (error) throw error;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (isMockMode) return mockChangePassword('', currentPassword, newPassword);

  // Re-authenticate to verify current password
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) throw new Error('not_authenticated');

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: currentPassword,
  });
  if (verifyError) throw new Error('wrong_password');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
