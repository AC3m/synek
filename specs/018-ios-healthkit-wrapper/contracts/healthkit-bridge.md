# Contract: HealthKit JavaScript ↔ Swift Bridge

**Feature**: 018-ios-healthkit-wrapper
**Date**: 2026-05-16
**Consumers**: synek web SPA (`app/lib/queries/healthkit-sync.ts`), synek iOS app (`synek-ios/Synek/Bridge/`)

---

## Overview

The bridge exposes a single global object — `window.__healthkit` — when the web app runs inside the iOS WKWebView. The web app uses bridge detection (`typeof window.__healthkit !== 'undefined'`) to conditionally render Apple Watch UI.

All requests are correlated by `requestId` (UUID v4, web-generated via `crypto.randomUUID()`). The native side never initiates a call — it only responds.

---

## Web API surface

```typescript
declare global {
  interface Window {
    __healthkit?: {
      call<TAction extends BridgeAction>(
        action: TAction,
        args?: BridgeArgs<TAction>,
      ): Promise<BridgeResult<TAction>>;
      _resolve(requestId: string, ok: unknown | null, err: BridgeError | null): void;
    };
  }
}

type BridgeAction = 'requestAuth' | 'fetchWorkouts' | 'getStatus' | 'getAppInfo';

interface BridgeError {
  code:
    | 'permission_denied'
    | 'permission_not_determined'
    | 'hk_unavailable'
    | 'invalid_args'
    | 'internal';
  message: string;
}
```

---

## Actions

### `requestAuth()`

Triggers iOS HealthKit permission sheet (only on first call — subsequent calls resolve immediately with the current state).

**Args**: none.

**Result**:

```typescript
{
  granted: boolean;
}
```

**Error codes**: `internal` (e.g. HK unavailable on device).

**Notes**: `granted: true` does NOT guarantee the user granted read access — HealthKit deliberately does not reveal denial of read access to apps. Treat `granted: true` as "permission sheet was shown and dismissed". Verify by calling `fetchWorkouts` and inspecting the result.

---

### `fetchWorkouts({ sinceMs })`

Fetches all workouts from HealthKit with `startDate >= sinceMs` (Unix epoch milliseconds).

**Args**:

```typescript
{
  sinceMs: number;
}
```

**Result**:

```typescript
{ workouts: HealthKitWorkout[] }
```

Where `HealthKitWorkout` matches the TypeScript shape in `data-model.md`.

**Error codes**:

- `invalid_args` — `sinceMs` missing or not a number
- `permission_denied` — HK reports access denied (rare, see note above)
- `internal` — query failure

**Ordering**: Results sorted by `startAt` descending.

**Limit**: No client-side limit. Native may chunk into pages internally but returns flat array.

---

### `getStatus()`

Reports current HealthKit availability and permission state.

**Args**: none.

**Result**:

```typescript
{
  available: boolean; // HKHealthStore.isHealthDataAvailable()
  permission: 'granted' | 'denied' | 'not_determined'; // authorization status for HKWorkoutType
}
```

**Error codes**: never errors; if HK unavailable, returns `available: false`.

---

### `getAppInfo()`

Returns iOS app version (for support / debug).

**Args**: none.

**Result**:

```typescript
{
  version: string; // CFBundleShortVersionString, e.g. "1.0.0"
  build: string; // CFBundleVersion, e.g. "42"
  os: string; // UIDevice.systemVersion, e.g. "17.4.1"
}
```

**Error codes**: never errors.

---

## Wire format (web → native)

Web sends one JSON object per call via `window.webkit.messageHandlers.healthkit.postMessage(...)`:

```json
{
  "action": "fetchWorkouts",
  "requestId": "e7c0a4d1-3b9f-4d2e-9a8c-1f2b3a4d5e6f",
  "sinceMs": 1715683200000
}
```

## Wire format (native → web)

Native resolves by calling:

```js
window.__healthkit._resolve(
  '<requestId>',
  /* ok */ {
    workouts: [
      /* ... */
    ],
  },
  /* err */ null,
);
```

Or rejects by calling:

```js
window.__healthkit._resolve(
  '<requestId>',
  /* ok */ null,
  /* err */ { code: 'permission_denied', message: 'User denied HealthKit access' },
);
```

Exactly one of `ok` and `err` must be non-null.

---

## Web shim (injected by native at `documentStart`)

The native side injects this script before any page script runs:

```js
(() => {
  const pending = new Map();
  window.__healthkit = {
    async call(action, args = {}) {
      if (!window.webkit?.messageHandlers?.healthkit) {
        throw new Error('healthkit bridge unavailable');
      }
      const requestId = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        try {
          window.webkit.messageHandlers.healthkit.postMessage({
            action,
            requestId,
            ...args,
          });
        } catch (e) {
          pending.delete(requestId);
          reject(e);
        }
      });
    },
    _resolve(requestId, ok, err) {
      const p = pending.get(requestId);
      if (!p) return;
      pending.delete(requestId);
      err ? p.reject(Object.assign(new Error(err.message), { code: err.code })) : p.resolve(ok);
    },
  };
})();
```

---

## Validation requirements

### Web side

- Wrap every `window.__healthkit.call(...)` result with Zod validation before passing into core logic (Principle III).
- Schemas live in `app/lib/queries/healthkit-sync.ts` and mirror this contract exactly.

### Native side

- Use `Codable` structs matching the wire formats above.
- Validate `action` against an exhaustive `enum BridgeAction` — unknown actions reject with `{ code: 'invalid_args' }`.
- Validate `requestId` is a non-empty string before attempting to reply.

---

## Contract evolution

When adding a new action:

1. Update this document first.
2. Add the action to both `BridgeAction` (TS) and the Swift `enum BridgeAction`.
3. Update Zod schemas in `app/lib/queries/healthkit-sync.ts`.
4. Update `XCTest` cases in `synek-ios` covering the new action.
5. Bump the iOS app version (any contract change requires a new app build).

When changing an existing action's shape:

- Treat as breaking. Either name a new action (`fetchWorkoutsV2`) and keep the old one as a stub returning `{ code: 'unsupported' }`, or coordinate a synchronized release of web + iOS.
