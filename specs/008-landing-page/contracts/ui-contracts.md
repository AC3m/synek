# UI Contracts: 008-landing-page

The landing page exposes three interactive forms. This document specifies each form's input contract, validation rules, submission behaviour, and success/error states.

---

## Form 1: Login (Log In section)

### Inputs

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | text (email) | yes | valid email format |
| password | password | yes | non-empty |

### Submission

- Calls `useAuth().login(email, password)`
- On success: redirect to `/${locale}/${user.role}` (locale from localStorage, default `pl`)
- On error: display error message inline below the form (do NOT clear inputs)

### States

| State | UI |
|-------|----|
| Idle | Submit button enabled |
| Pending | Submit button disabled + loading indicator |
| Error | Error message below form |
| Success | Redirect (form unmounts) |

---

## Form 2: Join Beta Registration (Join Beta section)

### Inputs

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| role | radio/toggle ('coach' \| 'athlete') | yes | must be selected |
| name | text | yes | min 1 character |
| email | text (email) | yes | valid email format |
| password | password | yes | min 8 chars, 1 uppercase, 1 number |
| website (honeypot) | text (hidden, `aria-hidden`, `tabIndex={-1}`) | — | must be empty |

### Submission

- Mock mode: `mockRegisterUser(email, password, name, role)` → `mockLogin()` → `login()`
- Real mode: POST to `${VITE_SUPABASE_URL}/functions/v1/register-user` with `{ name, email, password, role }`
  - On HTTP 200: `supabase.auth.signInWithPassword({ email, password })` (session fixation prevention)
  - On HTTP 4xx with `error: 'email_already_registered'`: show email-field error
  - On other errors: show generic error (never reveal if email is taken)
- On success: redirect to `/${locale}/${role}` (locale from localStorage, default `pl`)

### States

| State | UI |
|-------|----|
| Idle, no role selected | Submit button disabled |
| Idle, role selected | Submit button enabled |
| Pending | Submit button disabled + loading indicator |
| Email error | Inline error below email field |
| Generic error | Inline error below submit button |
| Success | Redirect (form unmounts) |

### Error Messages (i18n keys)

| Condition | Key |
|-----------|-----|
| Email already registered | `landing:beta.emailAlreadyRegistered` |
| Generic/network error | `common:auth.invalidCredentials` |
| Validation: role missing | `landing:beta.selectRole` |

---

## Form 3: Contact / Feedback (Contact section)

### Inputs

| Field | Type | Required | Prefilled when authed? | Validation |
|-------|------|----------|------------------------|------------|
| name | text | yes | yes — from `user.name` | min 1 character |
| email | text (email) | yes | yes — from `user.email` | valid email format |
| message | textarea | yes | no | min 1 character |
| website (honeypot) | text (hidden, `aria-hidden`, `tabIndex={-1}`) | — | no | must be empty |

Prefilled fields remain editable. The `userId` captured from the session is **not shown** to the user — it is sent as part of the mutation payload silently.

### Submission

- Calls `useSubmitFeedback()` mutation from `~/lib/hooks/useFeedback`
- Payload includes `userId: user?.id ?? null` from auth context
- Mutation inserts into `feedback_submissions` (or mock store)
- On success: show inline confirmation message + clear all fields
- On error: show generic error message below the submit button

### States

| State | UI |
|-------|----|
| Idle | Submit button enabled |
| Pending | Submit button disabled + loading indicator |
| Success | Confirmation message shown; form cleared |
| Error | Error message below submit button |

### Error Messages (i18n keys)

| Condition | Key |
|-----------|-----|
| Submit failed | `landing:contact.submitError` |
| Success confirmation | `landing:contact.submitSuccess` |

---

## Navigation Contract

The sticky nav renders anchor links. Each link's `href` is a hash anchor matching the `id` attribute on each section wrapper.

| Nav Label (i18n key) | Target `id` |
|---------------------|-------------|
| `landing:nav.getStarted` | `#get-started` |
| `landing:nav.whySynek` | `#why-synek` |
| `landing:nav.features` | `#features` |
| `landing:nav.logIn` | `#log-in` |
| `landing:nav.joinBeta` | `#join-beta` |
| `landing:nav.contact` | `#contact` |

Smooth scrolling is achieved via CSS `scroll-behavior: smooth` on `<html>` (already standard in Tailwind reset) or `element.scrollIntoView({ behavior: 'smooth' })` per link click.
