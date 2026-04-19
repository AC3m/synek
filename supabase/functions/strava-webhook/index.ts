import { serve } from "std/server";
import { createClient } from "supabase";

serve(async (req) => {
  const url = new URL(req.url);
  const verifyToken = Deno.env.get("STRAVA_WEBHOOK_VERIFY_TOKEN");

  if (!verifyToken) {
    return new Response("Missing STRAVA_WEBHOOK_VERIFY_TOKEN", { status: 500 });
  }

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === verifyToken && challenge) {
      return new Response(JSON.stringify({ "hub.challenge": challenge }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const callbackToken = url.searchParams.get("verify_token");
  if (callbackToken !== verifyToken) {
    return new Response("Forbidden", { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const isRevocationEvent =
    payload.object_type === 'athlete' &&
    payload.aspect_type === 'update' &&
    typeof payload.updates === "object" &&
    payload.updates !== null &&
    (payload.updates as Record<string, unknown>).authorized === "false";

  if (!isRevocationEvent) {
    return new Response("OK", { status: 200 });
  }

  const stravaAthleteId = Number(payload.owner_id);
  if (!Number.isFinite(stravaAthleteId)) {
    return new Response("Invalid owner_id", { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from('strava_tokens')
    .select('user_id')
    .eq('athlete_id', stravaAthleteId)
    .maybeSingle();

  if (tokenError) {
    console.error("Failed to fetch token row:", tokenError.message);
    return new Response("Token lookup failed", { status: 500 });
  }

  const userId = tokenData?.user_id;
  if (!userId) {
    // Idempotent behavior: if no token row remains, revocation is already applied.
    return new Response("OK", { status: 200 });
  }

  const { data: weekPlans, error: weekPlansError } = await supabaseAdmin
    .from('week_plans')
    .select('id')
    .eq('athlete_id', userId);

  if (weekPlansError) {
    console.error("Failed to load week plans:", weekPlansError.message);
    return new Response("Week plan lookup failed", { status: 500 });
  }

  const weekPlanIds = (weekPlans ?? []).map((row) => row.id as string);
  if (weekPlanIds.length > 0) {
    const { error: sessionsResetError } = await supabaseAdmin
      .from('training_sessions')
      .update({
        strava_activity_id: null,
        strava_synced_at: null,
        calories: null,
      })
      .in('week_plan_id', weekPlanIds)
      .not('strava_activity_id', 'is', null);

    if (sessionsResetError) {
      console.error("Failed to clear Strava training session links:", sessionsResetError.message);
      return new Response("Training session cleanup failed", { status: 500 });
    }
  }

  const { error: activitiesDeleteError } = await supabaseAdmin
    .from('strava_activities')
    .delete()
    .eq('user_id', userId);

  if (activitiesDeleteError) {
    console.error("Failed to delete Strava activities:", activitiesDeleteError.message);
    return new Response("Activities deletion failed", { status: 500 });
  }

  const { error: tokenDeleteError } = await supabaseAdmin
    .from('strava_tokens')
    .delete()
    .eq('athlete_id', stravaAthleteId);

  if (tokenDeleteError) {
    console.error("Failed to delete Strava token:", tokenDeleteError.message);
    return new Response("Token deletion failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
