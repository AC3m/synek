# How to Add a Component

## Rules

- Named export only — no default exports (routes are the exception)
- Props `interface` defined in the same file, above the component
- Always accept `className?: string` so callers can compose styles
- Handler props named `on[Action]` (e.g. `onClose`, `onAddSession`)
- Use `cn()` from `~/lib/utils` for all conditional class merging
- Use `useTranslation` — no hardcoded English strings in JSX

## Template

```tsx
import { cn } from '~/lib/utils'
import { useTranslation } from 'react-i18next'

interface MyWidgetProps {
  value: string
  onConfirm: (value: string) => void
  className?: string
}

export function MyWidget({ value, onConfirm, className }: MyWidgetProps) {
  const { t } = useTranslation('common')

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span>{t('my-widget.label')}</span>
      <button onClick={() => onConfirm(value)}>{t('my-widget.confirm')}</button>
    </div>
  )
}
```

## Canonical example

`app/components/calendar/SessionCard.tsx`

## Sport colors

Never invent color literals. Look up the token in `app/lib/utils/training-types.ts` and use the `text` / `bg` values it exports. See `docs/reference/conventions.md` for the full color table.
