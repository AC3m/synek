# How to Add Translations

## Rules

- Always add keys to **both** `en/` and `pl/` in the same commit — partial translations are not acceptable
- Keys use kebab-case: `session-form.title`, not `sessionForm.title`
- Namespaces: `common`, `coach`, `athlete`, `training`

## Steps

### 1. Pick the right namespace

| Namespace | Use for |
|---|---|
| `common` | Shared UI labels (buttons, errors, dates) |
| `coach` | Coach-only screens |
| `athlete` | Athlete-only screens |
| `training` | Session types, sport labels, metrics |

### 2. Add the key to both language files

`app/i18n/resources/en/training.json`:
```json
{
  "session-form": {
    "title": "Add Session",
    "save": "Save"
  }
}
```

`app/i18n/resources/pl/training.json`:
```json
{
  "session-form": {
    "title": "Dodaj sesję",
    "save": "Zapisz"
  }
}
```

### 3. Use in a component

```tsx
import { useTranslation } from 'react-i18next'

export function SessionForm() {
  const { t } = useTranslation('training')

  return <h1>{t('session-form.title')}</h1>
}
```

### 4. Dynamic keys TypeScript cannot verify

When building a key via template literal, cast to `as never`:

```tsx
const key = `types.${session.type}` as never
t(key)
```

## Gotchas

- Forgetting `pl/` will make Polish UI silently fall back to English — it won't throw an error
- Don't import the JSON directly; always go through `useTranslation`
