import { describe, it, expect } from 'vitest';
import {
  mockVerifyEmailToken,
  mockRequestPasswordReset,
  mockUpdatePassword,
  mockSaveUserRole,
  mockSignInWithGoogle,
  mockResendConfirmationEmail,
} from '~/lib/queries/auth-callbacks';

describe('mockVerifyEmailToken', () => {
  it('resolves for a valid-looking token', async () => {
    await expect(mockVerifyEmailToken('valid-token-hash', 'email')).resolves.toBeUndefined();
  });

  it('resolves for recovery type token', async () => {
    await expect(mockVerifyEmailToken('valid-token-hash', 'recovery')).resolves.toBeUndefined();
  });
});

describe('mockRequestPasswordReset', () => {
  it('resolves for any email', async () => {
    await expect(mockRequestPasswordReset('user@example.com')).resolves.toBeUndefined();
  });

  it('resolves for unknown email (no enumeration)', async () => {
    await expect(mockRequestPasswordReset('unknown@example.com')).resolves.toBeUndefined();
  });
});

describe('mockUpdatePassword', () => {
  it('resolves for a valid password', async () => {
    await expect(mockUpdatePassword('NewPass1')).resolves.toBeUndefined();
  });

  it('rejects for a weak password (no uppercase)', async () => {
    await expect(mockUpdatePassword('weakpass1')).rejects.toThrow();
  });

  it('rejects for a weak password (too short)', async () => {
    await expect(mockUpdatePassword('Pass1')).rejects.toThrow();
  });
});

describe('mockSaveUserRole', () => {
  it('saves role and resolves', async () => {
    await expect(mockSaveUserRole('user-123', 'coach')).resolves.toBeUndefined();
  });

  it('resolves for athlete role too', async () => {
    await expect(mockSaveUserRole('user-456', 'athlete')).resolves.toBeUndefined();
  });
});

describe('mockSignInWithGoogle', () => {
  it('throws not_available_in_mock in mock mode', async () => {
    await expect(mockSignInWithGoogle()).rejects.toThrow('not_available_in_mock');
  });
});

describe('mockResendConfirmationEmail', () => {
  it('resolves immediately for any email', async () => {
    await expect(mockResendConfirmationEmail('user@example.com')).resolves.toBeUndefined();
  });
});
