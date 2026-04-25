import { isMockMode } from '~/lib/supabase';
import type { SupportCategory } from '~/lib/schemas/support';

export interface SubmitSupportInput {
  name: string;
  email: string;
  message: string;
  category: SupportCategory;
  userId?: string | null;
  cfToken: string;
  honeypot: string;
}

export type SupportError =
  | 'turnstile_failed'
  | 'rate_limited'
  | 'invalid_email'
  | 'invalid_category'
  | 'invalid_params'
  | 'missing_params'
  | 'internal_error';

export class SupportSubmissionError extends Error {
  code: SupportError;
  constructor(code: SupportError) {
    super(code);
    this.code = code;
  }
}

export async function submitSupport(input: SubmitSupportInput): Promise<void> {
  if (isMockMode) {
    return;
  }

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-support`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      message: input.message,
      category: input.category,
      userId: input.userId ?? null,
      website: input.honeypot,
      cfToken: input.cfToken,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };

  if (!res.ok || !payload.success) {
    throw new SupportSubmissionError((payload.error as SupportError) ?? 'internal_error');
  }
}
