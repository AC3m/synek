# Check and fix i18n translation gaps

Audit all translation keys across all namespaces and ensure both EN and PL are in sync.

## Steps

1. Read all JSON files in `app/i18n/resources/en/` and `app/i18n/resources/pl/`
   - Namespaces: `common`, `coach`, `athlete`, `training`

2. For each namespace, do a deep comparison:
   - Keys present in EN but missing in PL → mark as **missing PL**
   - Keys present in PL but missing in EN → mark as **missing EN**
   - Values that are identical in EN and PL (likely untranslated) → mark as **suspect**

3. Search the codebase for `t('` and `useTranslation(` patterns to find:
   - Keys used in code but not present in any JSON → mark as **missing from JSON**
   - Keys in JSON not referenced in code → mark as **unused** (informational only, do not delete)

4. For each gap found:
   - If missing PL: add a Polish translation (ask me if unsure about the correct Polish text)
   - If missing from JSON: add the key with a reasonable English value + ask me for the Polish

5. Output a summary table:
   ```
   Namespace | Missing PL | Missing EN | Missing from JSON | Suspect (same EN=PL)
   ```
   Then list the specific keys per category.

6. Apply all fixes and run `pnpm typecheck` to confirm no TypeScript errors from i18next typing.
