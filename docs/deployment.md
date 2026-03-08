# Deployment Guide — Vercel CI/CD Setup

Synek deploys automatically to Vercel via native Git integration. Every push to `main` triggers a production deployment; every pull request gets a unique preview URL.

---

## A. Create a Vercel Account

1. Go to [vercel.com](https://vercel.com) → click **Sign Up**
2. Choose **Continue with GitHub** (recommended — links your repos automatically)
3. Authorize Vercel to access your GitHub account

---

## B. Import the Repository

1. From the Vercel dashboard → click **Add New Project**
2. Find `Synek` in the repository list → click **Import**
3. Leave **Framework Preset** as "Other" (Vercel will use `vercel.json`)
4. Leave **Build & Output Settings** blank (overridden by `vercel.json`)
5. Click **Deploy**

> The first deploy will fail because environment variables aren't set yet — this is expected. Continue to Section C.

---

## C. Configure Environment Variables

1. Go to **Project Settings → Environment Variables**
2. Add the following variables. Set scope to **Production, Preview, Development** for each:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Copy from your `.env.local` |
   | `VITE_SUPABASE_ANON_KEY` | Copy from your `.env.local` |

3. Trigger a new deployment: go to the **Deployments** tab → click the three-dot menu on the latest → **Redeploy**

---

## D. Verify Production Deployment

1. Click the deployment URL (e.g., `synek.vercel.app`)
2. Confirm the app loads and login works
3. Check the **Deployments** tab — status should be **Ready**
4. Navigate to a deep route (e.g., `/coach/week/2026-W10`) and refresh the page — it should load correctly, not return a 404

---

## E. Verify Preview Deployments

1. Create a branch: `git checkout -b test-preview`
2. Make a trivial visible change (e.g., update a heading)
3. Push and open a pull request against `main`
4. Within ~2 minutes, a Vercel bot posts a preview URL comment on the PR
5. Visit the URL and confirm it shows your branch's changes

---

## F. Failure Notifications

- Vercel sends email notifications on deployment failure by default
- To adjust: **Project Settings → Notifications**

---

## G. Rolling Back

1. Go to the **Deployments** tab
2. Find any previous deployment
3. Click the three-dot menu → **Promote to Production**
4. The selected deployment becomes live instantly — no rebuild needed

---

## H. What Happens on Every Push

| Event | Result |
|-------|--------|
| Push to `main` | Automatic production deployment |
| Push to any other branch | Preview deployment with unique URL |
| Open or update a pull request | Preview URL posted as a PR comment |

No manual steps are required after initial setup.
