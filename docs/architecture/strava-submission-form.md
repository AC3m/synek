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
- **Attribution:** Any workout synced from Strava displays the official "Powered by Strava" logo (horizontal SVG, adjusting to orange or white based on dark mode) directly below the performance metrics.
- **Link Back:** Every synced workout includes a "View on Strava" link, formatted in the mandatory `#FC5200` hex color and bold font, which opens the original activity on Strava (`https://www.strava.com/activities/[id]`). This text remains in English across all localizations of the app to comply with trademark rules.

## 3. Data Privacy and Consent
*(Requirement: Data cannot be shared with third parties without explicit user action/consent).*

**Implementation:**
- **Secure by Default:** When a session is synced from Strava, it is inserted into the database with a default `is_strava_confirmed = FALSE` flag.
- **Backend Masking:** We utilize Supabase Row Level Security (RLS) and a secure database view (`secure_strava_activities`). If a Coach attempts to view an unconfirmed session, the database intercepts the request and returns `NULL` for all sensitive metrics (distance, pace, heart rate, moving time, and raw data). The data never crosses the network.
- **Explicit Consent Action:** The athlete's UI displays a clear "Confirm & Share with Coach" button on synced sessions. Clicking this triggers a secure Remote Procedure Call (RPC) that sets the `is_confirmed` flag to `TRUE`, finally granting the coach access to view the metrics.

## 4. Webhooks and Data Retention
*(Requirement: Must handle webhook events, specifically `athlete:update` for authorization revocation, and delete data accordingly).*

**Implementation:**
- **Webhook Endpoint:** We have deployed a serverless Deno Edge Function at `https://[project].supabase.co/functions/v1/strava-webhook` that successfully responds to the `hub.challenge` GET handshake.
- **Revocation Handling:** The POST handler listens for `object_type: "athlete"`, `aspect_type: "update"`, and `updates.authorized === "false"`.
- **Data Deletion:** Upon receiving a revocation payload, the Edge Function extracts the user ID and performs a hard delete on all records in the `strava_activities` table associated with that user, followed by deleting their OAuth tokens from the `strava_tokens` table. This ensures complete data erasure in compliance with Strava's retention policies.

## 5. Background Token Refresh
- **Implementation:** We utilize a PostgreSQL background job (`pg_cron`) that runs hourly to scan the database for tokens expiring in the next 60 minutes. It triggers an Edge Function to hit the `oauth/token` endpoint with the `refresh_token` and silently updates the credentials in the database.

## 6. AI Model Training Compliance
- **Statement of Compliance:** Synek does not use, nor do we plan to use, any data obtained via the Strava API to train, fine-tune, or test Artificial Intelligence, Machine Learning, or Large Language Models.

---
**Prepared:** March 12, 2026
**Application Link:** [Strava Developer Submission](https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8)