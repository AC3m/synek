


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."day_of_week" AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);


ALTER TYPE "public"."day_of_week" OWNER TO "postgres";


CREATE TYPE "public"."load_type" AS ENUM (
    'easy',
    'medium',
    'hard'
);


ALTER TYPE "public"."load_type" OWNER TO "postgres";


CREATE TYPE "public"."training_type" AS ENUM (
    'run',
    'cycling',
    'strength',
    'yoga',
    'mobility',
    'swimming',
    'rest_day',
    'other',
    'walk',
    'hike'
);


ALTER TYPE "public"."training_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_all_strava_sessions_for_week"("p_week_plan_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify the user owns the week plan
  IF NOT EXISTS (
    SELECT 1 FROM week_plans
    WHERE id = p_week_plan_id
    AND athlete_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to confirm sessions for this week plan';
  END IF;

  -- Update training_sessions flag
  UPDATE training_sessions
  SET is_strava_confirmed = TRUE
  WHERE week_plan_id = p_week_plan_id
  AND strava_activity_id IS NOT NULL
  AND is_strava_confirmed = FALSE;

  -- Update strava_activities (compliance source of truth)
  UPDATE strava_activities sa
  SET is_confirmed = TRUE
  FROM training_sessions ts
  WHERE sa.training_session_id = ts.id
  AND ts.week_plan_id = p_week_plan_id
  AND sa.is_confirmed = FALSE;

END;
$$;


ALTER FUNCTION "public"."confirm_all_strava_sessions_for_week"("p_week_plan_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invite"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$                                  
  DECLARE                                                                                                     
    v_token text;
    v_count integer;                                                                                          
  BEGIN                                          
    SELECT COUNT(*) INTO v_count                                                                              
    FROM invites                                                                                              
    WHERE coach_id = auth.uid()                                                                               
      AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');                                          
                                                                                                              
    IF v_count >= 5 THEN                                                                                      
      RAISE EXCEPTION 'rate_limit_exceeded';                                                                  
    END IF;                                                                                                   
                                                                                                              
    v_token := replace(gen_random_uuid()::text, '-', '');                                                     
                                                                                                              
    INSERT INTO invites (token, coach_id)                                                                     
    VALUES (v_token, auth.uid());                
                                                                                                              
    RETURN v_token;                              
  END;                                   
  $$;


ALTER FUNCTION "public"."create_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invite_preview"("p_token" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_invite  invites%ROWTYPE;
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM invites WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'reason', 'not_found');
  END IF;

  -- Lazy expiry: update status if past expires_at
  IF v_invite.status = 'pending' AND v_invite.expires_at < now() THEN
    UPDATE invites SET status = 'expired' WHERE id = v_invite.id;
    v_invite.status := 'expired';
  END IF;

  IF v_invite.status = 'used' THEN
    RETURN json_build_object('valid', false, 'reason', 'used');
  END IF;

  IF v_invite.status = 'revoked' THEN
    RETURN json_build_object('valid', false, 'reason', 'revoked');
  END IF;

  IF v_invite.status = 'expired' THEN
    RETURN json_build_object('valid', false, 'reason', 'expired');
  END IF;

  -- Valid pending invite — fetch coach name
  SELECT * INTO v_profile FROM profiles WHERE id = v_invite.coach_id;

  RETURN json_build_object(
    'valid',      true,
    'coach_name', COALESCE(v_profile.name, 'Coach')
  );
END;
$$;


ALTER FUNCTION "public"."get_invite_preview"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'role', 'athlete')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: could not insert profile for % — %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."coach_athletes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coach_athletes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "message" "text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."feedback_submissions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."feedback_submissions"."user_id" IS 'Null for anonymous visitors; non-null links submission to a known profile, indicating internal user feedback.';



CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "coach_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval) NOT NULL,
    "used_by" "uuid",
    "used_at" timestamp with time zone,
    CONSTRAINT "invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'used'::"text", 'revoked'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text",
    "can_self_plan" boolean DEFAULT true NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['coach'::"text", 'athlete'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."strava_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "strava_id" bigint NOT NULL,
    "training_session_id" "uuid",
    "name" "text",
    "activity_type" "text",
    "start_date" timestamp with time zone,
    "moving_time_seconds" integer,
    "elapsed_time_seconds" integer,
    "distance_meters" numeric(10,2),
    "total_elevation_gain" numeric(8,2),
    "average_speed" numeric(6,3),
    "max_speed" numeric(6,3),
    "average_heartrate" numeric(5,1),
    "max_heartrate" numeric(5,1),
    "average_cadence" numeric(5,1),
    "calories" integer,
    "suffer_score" integer,
    "average_pace_per_km" "text",
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_confirmed" boolean DEFAULT false,
    "user_id" "uuid"
);


ALTER TABLE "public"."strava_activities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."secure_strava_activities" AS
 SELECT "id",
    "strava_id",
    "training_session_id",
    "user_id",
    "is_confirmed",
    "name",
    "activity_type",
    "start_date",
        CASE
            WHEN ("is_confirmed" = true) THEN "distance_meters"
            WHEN ("auth"."uid"() = "user_id") THEN "distance_meters"
            ELSE NULL::numeric
        END AS "distance_meters",
        CASE
            WHEN ("is_confirmed" = true) THEN "moving_time_seconds"
            WHEN ("auth"."uid"() = "user_id") THEN "moving_time_seconds"
            ELSE NULL::integer
        END AS "moving_time_seconds",
        CASE
            WHEN ("is_confirmed" = true) THEN "average_heartrate"
            WHEN ("auth"."uid"() = "user_id") THEN "average_heartrate"
            ELSE NULL::numeric
        END AS "average_heartrate",
        CASE
            WHEN ("is_confirmed" = true) THEN "average_pace_per_km"
            WHEN ("auth"."uid"() = "user_id") THEN "average_pace_per_km"
            ELSE NULL::"text"
        END AS "average_pace_per_km",
        CASE
            WHEN ("is_confirmed" = true) THEN "raw_data"
            WHEN ("auth"."uid"() = "user_id") THEN "raw_data"
            ELSE NULL::"jsonb"
        END AS "raw_data",
    "created_at",
    "updated_at"
   FROM "public"."strava_activities" "sa"
  WHERE (("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM ("public"."coach_athletes" "ca"
             JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
          WHERE (("ca"."coach_id" = "auth"."uid"()) AND ("ca"."athlete_id" = "sa"."user_id") AND ("p"."role" = 'coach'::"text")))));


ALTER VIEW "public"."secure_strava_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."strava_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "athlete_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "strava_athlete_name" "text",
    "connected_at" timestamp with time zone DEFAULT "now"(),
    "last_synced_at" timestamp with time zone
);


ALTER TABLE "public"."strava_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."training_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "week_plan_id" "uuid" NOT NULL,
    "day_of_week" "public"."day_of_week" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "training_type" "public"."training_type" NOT NULL,
    "description" "text",
    "coach_comments" "text",
    "planned_duration_minutes" integer,
    "planned_distance_km" numeric(6,2),
    "type_specific_data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "trainee_notes" "text",
    "strava_activity_id" bigint,
    "strava_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "actual_duration_minutes" integer,
    "actual_distance_km" numeric(6,2),
    "actual_pace" "text",
    "avg_heart_rate" integer,
    "max_heart_rate" integer,
    "rpe" integer,
    "coach_post_feedback" "text",
    "is_strava_confirmed" boolean DEFAULT false,
    CONSTRAINT "training_sessions_rpe_check" CHECK ((("rpe" >= 1) AND ("rpe" <= 10)))
);


ALTER TABLE "public"."training_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."week_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "week_start" "date" NOT NULL,
    "year" integer NOT NULL,
    "week_number" integer NOT NULL,
    "load_type" "public"."load_type",
    "total_planned_km" numeric(6,2),
    "description" "text",
    "coach_comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "athlete_id" "uuid",
    "actual_total_km" numeric(6,2),
    CONSTRAINT "valid_week_number" CHECK ((("week_number" >= 1) AND ("week_number" <= 53)))
);


ALTER TABLE "public"."week_plans" OWNER TO "postgres";


ALTER TABLE ONLY "public"."coach_athletes"
    ADD CONSTRAINT "coach_athletes_coach_id_athlete_id_key" UNIQUE ("coach_id", "athlete_id");



ALTER TABLE ONLY "public"."coach_athletes"
    ADD CONSTRAINT "coach_athletes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_submissions"
    ADD CONSTRAINT "feedback_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."strava_activities"
    ADD CONSTRAINT "strava_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."strava_activities"
    ADD CONSTRAINT "strava_activities_strava_id_key" UNIQUE ("strava_id");



ALTER TABLE ONLY "public"."strava_tokens"
    ADD CONSTRAINT "strava_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_sessions"
    ADD CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."week_plans"
    ADD CONSTRAINT "unique_athlete_week_start" UNIQUE ("athlete_id", "week_start");



ALTER TABLE ONLY "public"."week_plans"
    ADD CONSTRAINT "unique_athlete_year_week" UNIQUE ("athlete_id", "year", "week_number");



ALTER TABLE ONLY "public"."week_plans"
    ADD CONSTRAINT "week_plans_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_strava_activities_session" ON "public"."strava_activities" USING "btree" ("training_session_id") WHERE ("training_session_id" IS NOT NULL);



CREATE INDEX "idx_training_sessions_day" ON "public"."training_sessions" USING "btree" ("week_plan_id", "day_of_week");



CREATE INDEX "idx_training_sessions_strava" ON "public"."training_sessions" USING "btree" ("strava_activity_id") WHERE ("strava_activity_id" IS NOT NULL);



CREATE INDEX "idx_training_sessions_week" ON "public"."training_sessions" USING "btree" ("week_plan_id");



CREATE INDEX "idx_week_plans_date" ON "public"."week_plans" USING "btree" ("week_start");



CREATE INDEX "invites_coach_id_idx" ON "public"."invites" USING "btree" ("coach_id");



CREATE INDEX "invites_created_at_idx" ON "public"."invites" USING "btree" ("coach_id", "created_at");



CREATE UNIQUE INDEX "strava_tokens_user_id_idx" ON "public"."strava_tokens" USING "btree" ("user_id");



CREATE INDEX "week_plans_athlete_id_idx" ON "public"."week_plans" USING "btree" ("athlete_id");



CREATE INDEX "week_plans_athlete_week_idx" ON "public"."week_plans" USING "btree" ("athlete_id", "week_start");



CREATE OR REPLACE TRIGGER "trg_strava_activities_updated" BEFORE UPDATE ON "public"."strava_activities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_training_sessions_updated" BEFORE UPDATE ON "public"."training_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_week_plans_updated" BEFORE UPDATE ON "public"."week_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."coach_athletes"
    ADD CONSTRAINT "coach_athletes_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_athletes"
    ADD CONSTRAINT "coach_athletes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_submissions"
    ADD CONSTRAINT "feedback_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."strava_activities"
    ADD CONSTRAINT "strava_activities_training_session_id_fkey" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."strava_activities"
    ADD CONSTRAINT "strava_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."strava_tokens"
    ADD CONSTRAINT "strava_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_sessions"
    ADD CONSTRAINT "training_sessions_week_plan_id_fkey" FOREIGN KEY ("week_plan_id") REFERENCES "public"."week_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."week_plans"
    ADD CONSTRAINT "week_plans_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can insert feedback" ON "public"."feedback_submissions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Athlete can update own self_plan flag" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Coach can read athlete self_plan flag" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."coach_athletes"
  WHERE (("coach_athletes"."coach_id" = "auth"."uid"()) AND ("coach_athletes"."athlete_id" = "profiles"."id"))))));



CREATE POLICY "Coach can update athlete self_plan flag" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_athletes"
  WHERE (("coach_athletes"."coach_id" = "auth"."uid"()) AND ("coach_athletes"."athlete_id" = "profiles"."id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."coach_athletes"
  WHERE (("coach_athletes"."coach_id" = "auth"."uid"()) AND ("coach_athletes"."athlete_id" = "profiles"."id")))));



CREATE POLICY "Users can read own activities or confirmed for their athletes" ON "public"."strava_activities" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("is_confirmed" = true)));



CREATE POLICY "Users can update their own activities" ON "public"."strava_activities" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "anon_all_strava_tokens" ON "public"."strava_tokens" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "athlete_own_training_sessions" ON "public"."training_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."week_plans" "wp"
  WHERE (("wp"."id" = "training_sessions"."week_plan_id") AND ("wp"."athlete_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."week_plans" "wp"
  WHERE (("wp"."id" = "training_sessions"."week_plan_id") AND ("wp"."athlete_id" = "auth"."uid"())))));



CREATE POLICY "athlete_own_week_plans" ON "public"."week_plans" TO "authenticated" USING (("athlete_id" = "auth"."uid"())) WITH CHECK (("athlete_id" = "auth"."uid"()));



CREATE POLICY "coach_assigned_athlete_training_sessions" ON "public"."training_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."week_plans" "wp"
     JOIN "public"."coach_athletes" "ca" ON (("ca"."athlete_id" = "wp"."athlete_id")))
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("wp"."id" = "training_sessions"."week_plan_id") AND ("ca"."coach_id" = "auth"."uid"()) AND ("p"."role" = 'coach'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."week_plans" "wp"
     JOIN "public"."coach_athletes" "ca" ON (("ca"."athlete_id" = "wp"."athlete_id")))
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("wp"."id" = "training_sessions"."week_plan_id") AND ("ca"."coach_id" = "auth"."uid"()) AND ("p"."role" = 'coach'::"text")))));



CREATE POLICY "coach_assigned_athlete_week_plans" ON "public"."week_plans" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."coach_athletes" "ca"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("ca"."coach_id" = "auth"."uid"()) AND ("ca"."athlete_id" = "week_plans"."athlete_id") AND ("p"."role" = 'coach'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."coach_athletes" "ca"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("ca"."coach_id" = "auth"."uid"()) AND ("ca"."athlete_id" = "week_plans"."athlete_id") AND ("p"."role" = 'coach'::"text")))));



ALTER TABLE "public"."coach_athletes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_reads_athlete_profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."coach_athletes" "ca"
  WHERE (("ca"."coach_id" = "auth"."uid"()) AND ("ca"."athlete_id" = "profiles"."id")))));



CREATE POLICY "coach_reads_own_invites" ON "public"."invites" FOR SELECT TO "authenticated" USING (("coach_id" = "auth"."uid"()));



CREATE POLICY "coach_reads_own_relationships" ON "public"."coach_athletes" FOR SELECT TO "authenticated" USING (("coach_id" = "auth"."uid"()));



CREATE POLICY "coach_revokes_own_invites" ON "public"."invites" FOR UPDATE TO "authenticated" USING ((("coach_id" = "auth"."uid"()) AND ("status" = 'pending'::"text"))) WITH CHECK ((("coach_id" = "auth"."uid"()) AND ("status" = 'revoked'::"text")));



ALTER TABLE "public"."feedback_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_profile_read" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "own_profile_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "own_strava_token_delete" ON "public"."strava_tokens" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "own_strava_token_insert" ON "public"."strava_tokens" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own_strava_token_select" ON "public"."strava_tokens" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "own_strava_token_update" ON "public"."strava_tokens" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."strava_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."strava_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."week_plans" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."confirm_all_strava_sessions_for_week"("p_week_plan_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_all_strava_sessions_for_week"("p_week_plan_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_all_strava_sessions_for_week"("p_week_plan_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invite"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invite_preview"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invite_preview"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invite_preview"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";
























GRANT ALL ON TABLE "public"."coach_athletes" TO "anon";
GRANT ALL ON TABLE "public"."coach_athletes" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_athletes" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_submissions" TO "anon";
GRANT ALL ON TABLE "public"."feedback_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."strava_activities" TO "anon";
GRANT ALL ON TABLE "public"."strava_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."strava_activities" TO "service_role";



GRANT ALL ON TABLE "public"."secure_strava_activities" TO "anon";
GRANT ALL ON TABLE "public"."secure_strava_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."secure_strava_activities" TO "service_role";



GRANT ALL ON TABLE "public"."strava_tokens" TO "anon";
GRANT ALL ON TABLE "public"."strava_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."strava_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."training_sessions" TO "anon";
GRANT ALL ON TABLE "public"."training_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."training_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."week_plans" TO "anon";
GRANT ALL ON TABLE "public"."week_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."week_plans" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































