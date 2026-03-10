-- feedback_submissions: stores contact form messages from landing page visitors.
-- user_id is nullable — null means anonymous/pre-signup visitor.
-- Team reads submissions via Supabase dashboard; no admin UI is built.

create table feedback_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  message     text not null,
  user_id     uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on column feedback_submissions.user_id is
  'Null for anonymous visitors; non-null links submission to a known profile, indicating internal user feedback.';

alter table feedback_submissions enable row level security;

-- Anyone (including unauthenticated users) can insert feedback.
-- No read/update/delete access for anon or authenticated users — only service role (Supabase dashboard).
create policy "Anyone can insert feedback"
  on feedback_submissions
  for insert
  with check (true);
