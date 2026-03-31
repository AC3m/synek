# How to Add a Training Type (Sport)

Adding a new sport requires changes across 5 layers. Touch them all — skipping any one will break the type system or UI.

## Steps

### 1. Add to the domain union (`app/types/training.ts`)

```ts
// Add a new variant to TypeSpecificData
export type TypeSpecificData =
  | RunData
  | CyclingData
  | StrengthData
  | YogaData
  | MobilityData
  | SwimmingData
  | HikingData   // ← new

export interface HikingData {
  type: 'hiking'
  elevationGainM?: number
  distanceKm?: number
}
```

### 2. Add color config (`app/lib/utils/training-types.ts`)

```ts
hiking: {
  label: 'training:types.hiking',   // i18n key
  text: 'text-emerald-700',
  bg: 'bg-emerald-100',
},
```

Check that the color tokens do not clash with existing sports before picking.

### 3. Create sport-specific fields component

```
app/components/training/type-fields/HikingFields.tsx
```

Follow the same props shape as existing files (`CyclingFields.tsx`, `RunFields.tsx`). Export named, accept `className?: string`.

### 4. Render in `SessionForm.tsx`

Add a branch to the existing switch/conditional that renders `TypeSpecificData` fields:

```tsx
{session.typeData.type === 'hiking' && (
  <HikingFields data={session.typeData} onChange={...} />
)}
```

### 5. Add translation keys to both language files simultaneously

`app/i18n/resources/en/training.json`:
```json
{
  "types": {
    "hiking": "Hiking"
  },
  "hiking": {
    "elevation-gain": "Elevation gain (m)",
    "distance": "Distance (km)"
  }
}
```

`app/i18n/resources/pl/training.json`:
```json
{
  "types": {
    "hiking": "Piesze wędrówki"
  },
  "hiking": {
    "elevation-gain": "Przewyższenie (m)",
    "distance": "Dystans (km)"
  }
}
```

Partial translations (one language only) are not acceptable — both must ship together.

## Verification

Run `pnpm typecheck` — TypeScript will catch missing union branches.
