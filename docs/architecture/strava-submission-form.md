# Strava API Limit Extension Submission - Technical Outline

This document provides the exact technical details and architectural context required to fill out the Strava API Limit Extension Application form. It highlights how Synek complies with all developer guidelines.

## 1. App Information
- **App Name:** Synek
- **Core Use Case:** Synek is a training management platform that allows coaches to write training plans for athletes. The Strava integration is used exclusively to fetch an athlete's completed workout data so their coach can see what was actually executed versus what was planned.
- **Why we need the extension:** To allow more than 1 athlete (the developer) to authorize Synek to sync their training data to their respective coaches.

## 2. Branding and UI Compliance
*(Requirement: Must use official assets, display "Powered by Strava", and link back to Strava).*

**Implementation:**
- **Connection Flow:** The settings page (`/settings?tab=integrations`) uses the official SVG asset `btn_strava_connect_with_orange.svg` with an exact height of 48px to initiate the OAuth flow.
- **Attribution:** Athlete views of synced workouts display the official "Powered by Strava" logo (horizontal SVG, adjusting to orange or white based on dark mode) directly below the performance metrics. Coach views only show that attribution after the athlete confirms sharing.
- **Link Back:** Athlete views of synced workouts include a "View on Strava" link, formatted in the mandatory `#FC5200` hex color and bold font, which opens the original activity on Strava (`https://www.strava.com/activities/[id]`). Coach views only receive that link after athlete confirmation. This text remains in English across all localizations of the app to comply with trademark rules.

## 3. Data Privacy and Consent
*(Requirement: Data cannot be shared with third parties without explicit user action/consent).*

**Implementation:**
- **Secure by Default:** When a session is synced from Strava, `strava_activities.is_confirmed` defaults to `FALSE`.
- **Backend Masking:** The app reads calendar sessions through a secure SQL view (`secure_training_sessions`). For unconfirmed Strava sessions and coach viewers, sensitive metrics are returned as `NULL`, so raw metrics never cross the network.
- **Explicit Consent Action:** The athlete UI displays "Confirm & Share with Coach" for unconfirmed Strava sessions. This calls a secure RPC that updates `strava_activities.is_confirmed = TRUE`.

## 4. Webhooks and Data Retention
*(Requirement: Must handle webhook events, specifically `athlete:update` for authorization revocation, and delete data accordingly).*

**Implementation:**
- **Webhook Endpoint:** We deploy a Deno Edge Function at `https://[project].supabase.co/functions/v1/strava-webhook`.
- **Validation:** GET handshake validates `hub.verify_token`; POST events require a callback URL `verify_token` query secret.
- **Revocation Handling:** The POST handler listens for `object_type: "athlete"`, `aspect_type: "update"`, and `updates.authorized === "false"`.
- **Data Deletion:** Upon receiving a revocation payload, the Edge Function extracts the user ID, clears all linked Strava references from the athlete's training sessions, deletes records from the `strava_activities` table associated with that user, and then deletes their OAuth tokens from the `strava_tokens` table. The in-app disconnect flow performs the same cleanup and attempts Strava deauthorization. This ensures complete data erasure in compliance with Strava's retention policies.

## 5. Background Token Refresh
- **Implementation:** We utilize a PostgreSQL background job (`pg_cron`) that runs hourly to scan the database for tokens expiring in the next 60 minutes. It triggers an Edge Function to hit the `oauth/token` endpoint with the `refresh_token` and silently updates the credentials in the database.

## 6. AI Model Training Compliance
- **Statement of Compliance:** Synek does not use, nor do we plan to use, any data obtained via the Strava API to train, fine-tune, or test Artificial Intelligence, Machine Learning, or Large Language Models.

---
**Prepared:** March 12, 2026
**Application Link:** [Strava Developer Submission](https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8)
