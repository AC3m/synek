import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export class AuthError extends Error {
  constructor(message = 'unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Extracts and validates the caller's user ID from the request JWT.
 * Throws {@link AuthError} when the header is missing or the token is invalid.
 */
export async function extractUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError();
  }

  const jwt = authHeader.slice(7);
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data, error } = await anonClient.auth.getUser(jwt);
  if (error || !data.user) {
    throw new AuthError();
  }

  return data.user.id;
}
