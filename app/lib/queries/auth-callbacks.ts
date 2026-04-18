import { supabase, isMockMode } from '~/lib/supabase';
import type { UserRole } from '~/lib/auth';

// ============================================================
// Mock implementations
// ============================================================

export async function mockVerifyEmailToken(
  _tokenHash: string,
  _type: 'email' | 'recovery',
): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  // Mock: always succeeds for any token
}

// Allows tests to inject a specific error (e.g. 'google_only_account') via the module mock.
// In production mock mode the function always resolves silently.
export async function mockRequestPasswordReset(_email: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200));
  // Mock: always resolves (no email sent, no enumeration)
}

export async function mockUpdatePassword(newPassword: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200));
  // Mirror server-side password policy
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw new Error('weak_password');
  }
}

export async function mockSaveUserRole(_userId: string, _role: UserRole): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
  // Mock: role is saved in-memory (context handles local state update)
}

export async function mockSignInWithGoogle(): Promise<void> {
  throw new Error('not_available_in_mock');
}

export async function mockResendConfirmationEmail(_email: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
  // Mock: resolves immediately, no email sent
}

// ============================================================
// Real implementations
// ============================================================

export async function verifyEmailToken(tokenHash: string, type: 'email' | 'recovery') {
  if (isMockMode) {
    await mockVerifyEmailToken(tokenHash, type);
    return { user: null, session: null };
  }
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (isMockMode) return mockRequestPasswordReset(email);
  const redirectTo = `${window.location.origin}/auth/callback`;

  // FR-018: detect Google-only accounts before sending a reset link.
  // We fetch the user's identity providers via getUser (returns null for unauthenticated callers
  // on the public schema — fall through silently to preserve anti-enumeration).
  // Full server-side enforcement lives in the register-user Edge Function; this is a best-effort
  // client-side guard for the password-reset flow.
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const identities = userData.user.identities ?? [];
      const hasPasswordIdentity = identities.some((i) => i.provider === 'email');
      if (!hasPasswordIdentity && identities.length > 0) {
        throw new Error('google_only_account');
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'google_only_account') throw err;
    // Ignore other errors (not authenticated, etc.) — proceed to reset email
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    if (error.message?.toLowerCase().includes('rate') || error.status === 429) {
      throw new Error('reset_rate_limited');
    }
    throw error;
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  if (isMockMode) return mockUpdatePassword(newPassword);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('weak') || msg.includes('password strength')) {
      throw new Error('weak_password');
    }
    if (msg.includes('different') || msg.includes('same password')) {
      throw new Error('same_password');
    }
    throw error;
  }
}

export async function signInWithGoogle(): Promise<void> {
  if (isMockMode) return mockSignInWithGoogle();
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function saveUserRole(userId: string, role: UserRole): Promise<void> {
  if (isMockMode) return mockSaveUserRole(userId, role);
  const { error: authError } = await supabase.auth.updateUser({ data: { role } });
  if (authError) throw authError;
  const { error: profileError } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (profileError) throw profileError;
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  if (isMockMode) return mockResendConfirmationEmail(email);
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) {
    // Supabase returns "over_email_send_rate_limit" or HTTP 429 when too many emails are sent
    if (error.message?.toLowerCase().includes('rate') || error.status === 429) {
      throw new Error('rate_limited');
    }
    throw error;
  }
}
