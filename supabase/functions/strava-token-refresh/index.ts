import { createClient } from "supabase";

// Note: In production, trigger this via pg_cron calling the edge function URL
Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const clientId = Deno.env.get('STRAVA_CLIENT_ID');
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return new Response("Missing Strava credentials", { status: 500 });
  }

  // Find tokens expiring in the next 60 minutes
  const { data: expiringTokens } = await supabaseAdmin
    .from('strava_tokens')
    .select('id, refresh_token')
    .lte('expires_at', new Date(Date.now() + 60 * 60 * 1000).toISOString());

  if (!expiringTokens || expiringTokens.length === 0) {
    return new Response("No tokens to refresh", { status: 200 });
  }

  const results = [];

  for (const token of expiringTokens) {
    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: token.refresh_token,
        }),
      });

      if (!response.ok) throw new Error(`Strava API error: ${response.statusText}`);
      
      const newAuth = await response.json();

      await supabaseAdmin
        .from('strava_tokens')
        .update({
          access_token: newAuth.access_token,
          refresh_token: newAuth.refresh_token,
          expires_at: new Date(newAuth.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', token.id);

      results.push({ id: token.id, status: 'success' });
    } catch (error: any) {
      results.push({ id: token.id, status: 'failed', error: error.message });
    }
  }

  return new Response(JSON.stringify(results), { 
    headers: { "Content-Type": "application/json" }
  });
});