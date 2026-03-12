import { serve } from "std/server";
import { createClient } from "supabase";

serve(async (req) => {
  const url = new URL(req.url);

  // 1. Handle GET (Webhook Registration Challenge)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && challenge) {
      return new Response(JSON.stringify({ "hub.challenge": challenge }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
  }

  // 2. Handle POST (Event Payload)
  if (req.method === 'POST') {
    const payload = await req.json();

    // Check for authorization revocation
    if (payload.object_type === 'athlete' && payload.aspect_type === 'update' && payload.updates?.authorized === "false") {
      const stravaAthleteId = payload.owner_id;

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Extract user_id to explicitly delete all associated activities
      const { data: tokenData } = await supabaseAdmin
        .from('strava_tokens')
        .select('user_id')
        .eq('athlete_id', stravaAthleteId)
        .single();

      if (tokenData?.user_id) {
         // Explicitly delete activities first
         await supabaseAdmin.from('strava_activities').delete().eq('user_id', tokenData.user_id);
         // Explicitly delete token
         await supabaseAdmin.from('strava_tokens').delete().eq('athlete_id', stravaAthleteId);
      }
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method Not Allowed", { status: 405 });
});