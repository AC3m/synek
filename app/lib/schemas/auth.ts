import { z } from 'zod';

// Password policy — mirrors server-side validation in register-user Edge Function
const passwordSchema = z
  .string()
  .min(8, 'Min 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[0-9]/, 'Must contain a number');

// Registration form
export const registrationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: passwordSchema,
  role: z.enum(['coach', 'athlete']),
  cfToken: z.string().min(1, 'Bot check token is required'),
});

// Forgot password form
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
});

// Reset password form (new password + confirm)
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Role selection (Google OAuth first-time users)
export const roleSelectionSchema = z.object({
  role: z.enum(['coach', 'athlete']),
});
