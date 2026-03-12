-- Add confirmation and user_id to strava_activities
ALTER TABLE strava_activities
ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id for existing activities based on the linked training_session -> week_plan -> athlete_id
UPDATE strava_activities sa
SET user_id = wp.athlete_id
FROM training_sessions ts
JOIN week_plans wp ON wp.id = ts.week_plan_id
WHERE sa.training_session_id = ts.id
AND sa.user_id IS NULL;

-- Enable RLS
ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "anon_all_strava_activities" ON strava_activities;

-- Create policies
CREATE POLICY "Users can read own activities or confirmed for their athletes"
ON strava_activities FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  is_confirmed = TRUE
);

CREATE POLICY "Users can update their own activities"
ON strava_activities FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Create a secure view for reading strava_activities with masked data for coaches
CREATE OR REPLACE VIEW secure_strava_activities AS
SELECT 
    sa.id,
    sa.strava_id,
    sa.training_session_id,
    sa.user_id,
    sa.is_confirmed,
    sa.name,
    sa.activity_type,
    sa.start_date,
    -- Masked fields
    CASE 
        WHEN sa.is_confirmed = TRUE THEN sa.distance_meters
        WHEN auth.uid() = sa.user_id THEN sa.distance_meters
        ELSE NULL 
    END as distance_meters,
    CASE 
        WHEN sa.is_confirmed = TRUE THEN sa.moving_time_seconds
        WHEN auth.uid() = sa.user_id THEN sa.moving_time_seconds
        ELSE NULL 
    END as moving_time_seconds,
    CASE 
        WHEN sa.is_confirmed = TRUE THEN sa.average_heartrate
        WHEN auth.uid() = sa.user_id THEN sa.average_heartrate
        ELSE NULL 
    END as average_heartrate,
    CASE 
        WHEN sa.is_confirmed = TRUE THEN sa.average_pace_per_km
        WHEN auth.uid() = sa.user_id THEN sa.average_pace_per_km
        ELSE NULL 
    END as average_pace_per_km,
    CASE 
        WHEN sa.is_confirmed = TRUE THEN sa.raw_data
        WHEN auth.uid() = sa.user_id THEN sa.raw_data
        ELSE NULL 
    END as raw_data,
    sa.created_at,
    sa.updated_at
FROM strava_activities sa
WHERE 
    sa.user_id = auth.uid() OR
    EXISTS (
        -- Check if current user is a coach of this athlete
        SELECT 1 FROM coach_athletes ca 
        JOIN profiles p ON p.id = auth.uid()
        WHERE ca.coach_id = auth.uid() 
          AND ca.athlete_id = sa.user_id 
          AND p.role = 'coach'
    );

-- Grant access to the view
GRANT SELECT ON secure_strava_activities TO authenticated;