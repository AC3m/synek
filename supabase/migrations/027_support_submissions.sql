-- Extend feedback_submissions to also hold support requests.
-- Reuses table: same shape, same RLS, distinguished by `kind`.
-- `category` is optional and only meaningful for kind = 'support' (general | bug | strava | account).

alter table feedback_submissions
  add column if not exists kind text not null default 'feedback'
    check (kind in ('feedback', 'support'));

alter table feedback_submissions
  add column if not exists category text
    check (category is null or category in ('general', 'bug', 'strava', 'account'));

create index if not exists feedback_submissions_kind_idx
  on feedback_submissions (kind, created_at desc);
