# Scaffold a new component

Create a new component for this project. Arguments: `$ARGUMENTS` (e.g. `calendar/MyWidget` or `training/MyForm`).

## Steps

1. Parse the argument to extract folder and component name (PascalCase).

2. Determine which i18n namespace applies:
   - `layout/` → `common`
   - `calendar/` → `coach` or `trainee`
   - `training/` → `training`
   - Unsure → `common`

3. Create the component file at `app/components/<folder>/<ComponentName>.tsx`:
   - Named export (not default)
   - Props interface defined in the same file above the component
   - Include `className?: string` prop using `cn()` from `~/lib/utils`
   - Use `useTranslation` with the appropriate namespace
   - Empty/placeholder JSX body ready to be filled in

4. If the component involves data fetching, identify the closest existing hook in `app/lib/hooks/` and import it. Do not create new hooks unless the data clearly isn't covered.

5. Output a summary of:
   - File created
   - Namespace used
   - Next steps (e.g. "Add translation keys to en/pl JSON files")
