# Add a new training type (sport)

Add a new sport/training type to the system. Arguments: `$ARGUMENTS` (e.g. `hiking` or `rowing`).

## Checklist — complete ALL steps in order

### 1. Database enum
Add the new value to the `training_type` enum in a new migration file:
- Create `supabase/migrations/00N_add_<type>_training_type.sql`
- `ALTER TYPE training_type ADD VALUE '<type>';`

### 2. Domain type
In `app/types/training.ts`:
- Create `<Type>Data` interface with `type: '<type>'` discriminant field + relevant sport-specific fields
- Add `<Type>Data` to the `TypeSpecificData` union
- Add `'<type>'` to the `TrainingType` union/enum

### 3. Color config
In `app/lib/utils/training-types.ts`:
- Add a color entry for the new type following the existing pattern
- Choose a Tailwind color not already used by other sport types
- Add both text color and background color classes

### 4. Form fields component
Create `app/components/training/type-fields/<Type>Fields.tsx`:
- Named export `<Type>Fields`
- Props: `{ data?: <Type>Data; onChange: (data: <Type>Data) => void }`
- Input fields mapped to the `<Type>Data` fields
- All labels use `t()` from `training` namespace

### 5. SessionForm integration
In `app/components/training/SessionForm.tsx`:
- Import the new `<Type>Fields` component
- Add a case to the training type switch/conditional for rendering type-specific fields

### 6. Translations — both languages
Add to `app/i18n/resources/en/training.json` AND `app/i18n/resources/pl/training.json`:
- Type label: `"types.<type>": "Hiking"`
- Field labels for each form field

### 7. Week-view / stats
In `app/lib/utils/week-view.ts`:
- Ensure `computeWeekStats` handles the new type correctly (distance/duration if applicable)

### 8. Typecheck
Run `pnpm typecheck` — all TypeScript errors must be resolved before finishing.

### Output
List every file modified and confirm all 8 steps completed.
