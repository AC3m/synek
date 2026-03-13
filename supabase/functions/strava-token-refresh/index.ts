import { createClient } from "supabase";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const internalToken = Deno.env.get("SUPABASE_INTERNAL_FUNCTIONS_TOKEN");
  const authHeader = req.headers.get("Authorization");

  if (!internalToken) {
    return new Response("Missing internal token config", { status: 500 });
  }

  if (authHeader !== `Bearer ${internalToken}`) {
    return new Response("Unauthorized", { status: 401 });
  }

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
  const { data: expiringTokens, error: tokenQueryError } = await supabaseAdmin
    .from('strava_tokens')
    .select('id, refresh_token')
    .lte('expires_at', new Date(Date.now() + 60 * 60 * 1000).toISOString());

  if (tokenQueryError) {
    console.error("Failed querying expiring tokens:", tokenQueryError.message);
    return new Response("Failed to load expiring tokens", { status: 500 });
  }

  if (!expiringTokens || expiringTokens.length === 0) {
    return new Response(JSON.stringify({ checked: 0, refreshed: 0, failed: 0 }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  let refreshed = 0;
  let failed = 0;

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

      const { error: updateError } = await supabaseAdmin
        .from('strava_tokens')
        .update({
          access_token: newAuth.access_token,
          refresh_token: newAuth.refresh_token,
          expires_at: new Date(newAuth.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', token.id);

      if (updateError) {
        throw new Error(`DB update failed: ${updateError.message}`);
      }

      refreshed += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown refresh error";
      console.error(`Token refresh failed for ${token.id}:`, message);
    }
  }

  return new Response(JSON.stringify({
    checked: expiringTokens.length,
    refreshed,
    failed,
  }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
