# Contract: Migration Script CLI

**File**: `scripts/migrate-sheets.ts`
**Runtime**: `pnpm dlx tsx scripts/migrate-sheets.ts`

---

## Input

| Source | Value |
|---|---|
| CSV file | `.data/googleSheetData.csv` (hardcoded path relative to repo root) |
| `VITE_SUPABASE_URL` | env var from `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | env var (service-role key bypasses RLS) |
| `ATHLETE_ID` | env var — UUID of the target athlete in Supabase |

---

## Output (stdout)

```
=== Synek Sheets Migration ===
Reading CSV: .data/googleSheetData.csv
Parsed 270 rows.

Processing week 2025-W40 (2025-09-29)...
  [created] week plan 2025-09-29
  [created] session monday run "Poranny Bieg 8km"
  ...

...

=== Summary ===
Weeks created:   25
Weeks skipped:    0 (already existed)
Sessions created: 142
Sessions skipped: 0 (already existed)
Rows rejected:    0

Warnings:
  - Row 23: training type "" mapped to "other"
  ...
```

---

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success — all rows processed (warnings may exist) |
| 1 | Fatal error — missing env vars, file not found, or DB connection failure |

---

## Idempotency Guarantee

Running the script twice produces the same DB state. On second run, all entries log as "skipped (already existed)" and the summary shows 0 created.

---

## Dry-Run Mode (optional flag)

```
pnpm dlx tsx scripts/migrate-sheets.ts --dry-run
```

Parses and validates the CSV, prints what would be created, but makes no DB writes. Exits 0 if validation passes, 1 if validation errors exist.
