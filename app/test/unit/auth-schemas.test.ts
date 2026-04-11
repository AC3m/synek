import { describe, it, expect } from 'vitest';
import {
  registrationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  roleSelectionSchema,
} from '~/lib/schemas/auth';

describe('registrationSchema', () => {
  const valid = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'Password1',
    role: 'athlete' as const,
    cfToken: 'some-token',
  };

  it('accepts valid input', () => {
    expect(registrationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = registrationSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = registrationSchema.safeParse({ ...valid, password: 'Pass1' });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase letter', () => {
    const result = registrationSchema.safeParse({ ...valid, password: 'password1' });
    expect(result.success).toBe(false);
  });

  it('rejects password without digit', () => {
    const result = registrationSchema.safeParse({ ...valid, password: 'Password' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = registrationSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects empty email', () => {
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  const valid = { password: 'NewPass1', confirmPassword: 'NewPass1' };

  it('accepts matching valid passwords', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewPass1',
      confirmPassword: 'Different1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password (no uppercase)', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'newpass1', confirmPassword: 'newpass1' }).success,
    ).toBe(false);
  });

  it('rejects weak password (no digit)', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'NewPassword', confirmPassword: 'NewPassword' })
        .success,
    ).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'New1', confirmPassword: 'New1' }).success,
    ).toBe(false);
  });
});

describe('roleSelectionSchema', () => {
  it('accepts "coach"', () => {
    expect(roleSelectionSchema.safeParse({ role: 'coach' }).success).toBe(true);
  });

  it('accepts "athlete"', () => {
    expect(roleSelectionSchema.safeParse({ role: 'athlete' }).success).toBe(true);
  });

  it('rejects invalid role', () => {
    expect(roleSelectionSchema.safeParse({ role: 'admin' }).success).toBe(false);
  });
});
