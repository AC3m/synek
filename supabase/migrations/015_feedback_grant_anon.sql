-- Grant INSERT permission to anon role so unauthenticated visitors can submit feedback.
-- The RLS policy alone is not sufficient — the role also needs table-level permission.
grant insert on table feedback_submissions to anon;
grant insert on table feedback_submissions to authenticated;
