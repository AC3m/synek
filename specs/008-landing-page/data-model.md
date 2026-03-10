# Data Model: 008-landing-page

**Phase 1 output** | **Date**: 2026-03-10

---

## New Entity: FeedbackSubmission

Represents a message submitted via the Contact section. Submissions are accepted from both anonymous visitors and authenticated users. An optional `userId` FK links the record to a `profiles` row when the submitter is logged in — enabling the team to distinguish high-value internal feedback from pre-signup feedback.

**Admin processing**: feedback is read directly via the Supabase dashboard. No admin UI is built as part of this feature.

### TypeScript Type

```typescript
// app/types/feedback.ts
export interface FeedbackSubmission {
  id: string
  name: string
  email: string
  message: string
  userId: string | null   // null = anonymous visitor; non-null = authenticated user
  createdAt: string       // ISO 8601
}

export interface CreateFeedbackInput {
  name: string
  email: string
  message: string
  userId?: string | null  // passed from auth context when available
}
```

### Database Table

```sql
-- supabase/migrations/014_feedback_submissions.sql
create table feedback_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  message     text not null,
  user_id     uuid references profiles(id) on delete set null,  -- null = anonymous
  created_at  timestamptz not null default now()
);

-- Public insert (both anon and authenticated users can submit)
-- No read/update/delete for anon — team reads via Supabase dashboard
alter table feedback_submissions enable row level security;

create policy "Anyone can insert feedback"
  on feedback_submissions for insert
  with check (true);
```

### Validation Rules

- `name`: required, min 1 character (prefilled from auth context for logged-in users)
- `email`: required, valid email format (prefilled from auth context for logged-in users)
- `message`: required, min 1 character
- `userId`: optional; populated automatically from session — never entered manually by the user

### Row Mapper

```typescript
// app/lib/queries/feedback.ts
function toFeedbackSubmission(row: Record<string, unknown>): FeedbackSubmission {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    message: row.message as string,
    userId: (row.user_id as string) ?? null,
    createdAt: row.created_at as string,
  }
}
```

### ContactSection UX — Auth-aware behaviour

| Visitor state | Name field | Email field | userId on submit |
|---------------|------------|-------------|-----------------|
| Anonymous | Editable, empty | Editable, empty | `null` |
| Authenticated | Prefilled, editable | Prefilled, editable | `user.id` |

Authenticated users can still edit their name/email before submitting (e.g. if they want to submit anonymously or use a different address). The `userId` is always captured from the session regardless of what name/email they type — it is not displayed to the user.

---

## Modified Entity: AuthUser (registration extension)

No schema change to the `profiles` table. The existing `profiles` table already has `role` ('coach' | 'athlete'). The change is in the **registration flow**: a new `register-user` edge function accepts both roles.

### New Edge Function Input

```typescript
// supabase/functions/register-user/index.ts — input shape
interface RegisterUserInput {
  name: string
  email: string
  password: string
  role: 'coach' | 'athlete'
}
```

### Mock Registration Extension

```typescript
// app/lib/auth.ts — new helper (generalises mockRegisterCoach)
export function mockRegisterUser(
  email: string,
  password: string,
  name: string,
  role: 'coach' | 'athlete'
): AuthUser
```

---

## No Other Schema Changes

The landing page hero, Why Synek, and Features sections are purely presentational. The Login section reuses the existing `supabase.auth.signInWithPassword` flow. No tables are modified beyond the new `feedback_submissions`.

---

## Query Key Addition

```typescript
// app/lib/queries/keys.ts — addition
export const feedbackKeys = {
  all: ['feedback'] as const,
}
```

---

## Mock Data Module

```typescript
// app/lib/mock-data/feedback.ts

import type { FeedbackSubmission } from '~/types/feedback'

let MOCK_FEEDBACK: FeedbackSubmission[] = []

export function getMockFeedback(): FeedbackSubmission[] {
  return MOCK_FEEDBACK
}

export function addMockFeedback(submission: FeedbackSubmission): void {
  MOCK_FEEDBACK.push(submission)
}

export function resetMockFeedback(): void {
  MOCK_FEEDBACK = []
}
```
