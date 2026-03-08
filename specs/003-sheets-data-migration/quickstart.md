# Quickstart: Google Sheets Migration

**Branch**: `001-sheets-data-migration`

---

## Prerequisites

1. Supabase project running with migrations 001–008 applied.
2. `.env` file at repo root with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. A **service-role key** for the migration script (get from Supabase dashboard → Settings → API).
4. The athlete's Supabase user UUID (run `SELECT id FROM auth.users WHERE email = 'your@email.com'` in SQL editor, or find in Auth dashboard).

---

## Step 1 — Apply schema migration

```bash
# Apply the new DB migration (adds actual performance columns + 'other' type)
supabase db push
# or directly:
supabase migration apply 009_sheets_schema_extension
```

Verify the migration ran:
```sql
-- Should show new columns
\d training_sessions
\d week_plans
```

---

## Step 2 — Verify CSV location

The CSV export from Google Sheets must be at:
```
.data/googleSheetData.csv
```

It's already there (gitignored). If you re-export from Google Sheets, use **File → Download → CSV** with the default encoding (UTF-8).

---

## Step 3 — Run the migration (dry run first)

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
ATHLETE_ID=your_athlete_uuid \
pnpm dlx tsx scripts/migrate-sheets.ts --dry-run
```

Review the output. Confirm the week/session counts match expectations (~25 weeks, ~150 sessions).

---

## Step 4 — Run the migration (live)

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
ATHLETE_ID=your_athlete_uuid \
pnpm dlx tsx scripts/migrate-sheets.ts
```

Expected output:
```
=== Summary ===
Weeks created:   25
Sessions created: ~150
Rows rejected:    0
```

---

## Step 5 — Verify in app

```bash
pnpm dev
```

1. Log in as the athlete.
2. Navigate to a past week (e.g., W43 2025 — week of 2025-10-20).
3. Confirm sessions appear with correct types and actual performance data.
4. Log in as coach.
5. Confirm you can add post-training feedback to a completed session.

---

## Rollback

If something went wrong, delete all migrated data for the athlete:

```sql
-- Delete all sessions via week plans cascade
DELETE FROM week_plans WHERE athlete_id = 'your_athlete_uuid';
```

Then re-run the migration after fixing the issue.

---

## Running tests after implementation

```bash
pnpm typecheck   # Must pass before merge
pnpm build       # Confirm no build errors
```
