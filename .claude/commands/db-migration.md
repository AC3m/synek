# Create a new Supabase migration

Write a new database migration. Arguments: `$ARGUMENTS` (description of what needs to change, e.g. "add athlete_id to training_sessions").

## Steps

1. List existing migrations in `supabase/migrations/` to determine the next sequence number.

2. Create `supabase/migrations/00N_<slug>.sql` where:
   - `N` is the next number in sequence (zero-padded to 3 digits)
   - `<slug>` is a snake_case description of the change

3. Write the migration SQL following these conventions:
   - Always use `IF NOT EXISTS` / `IF EXISTS` guards where applicable
   - For new columns: use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - For new tables: include `CREATE TABLE IF NOT EXISTS` with full constraints
   - Add appropriate indexes: `CREATE INDEX IF NOT EXISTS idx_... ON ...`
   - Include `updated_at` trigger for tables that need it (follow pattern from existing migrations)
   - Add RLS policies if the table contains user data
   - End with a comment block: `-- Migration: <description>`

4. If the migration changes the TypeScript domain model, also update:
   - `app/types/training.ts` — update the relevant type
   - `app/lib/queries/<entity>.ts` — update the row mapper and query functions
   - `app/lib/mock-data.ts` — update mock data to match new shape

5. Run `pnpm typecheck` to confirm TypeScript is consistent with schema changes.

6. Output the complete migration SQL and list all TypeScript files changed.
