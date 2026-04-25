import { z } from 'zod';

export const SUPPORT_CATEGORIES = ['general', 'bug', 'strava', 'account'] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const supportSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').max(254),
  message: z.string().min(1, 'Message is required').max(5000),
  category: z.enum(SUPPORT_CATEGORIES),
  cfToken: z.string().min(1, 'Bot check token is required'),
});

export type SupportFormData = z.infer<typeof supportSchema>;
