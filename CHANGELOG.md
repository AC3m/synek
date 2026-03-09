# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-09

### Features

- **001-sheets-data-migration**: Imported historical training data from Google Sheets into Supabase; established `week_plans` and `training_sessions` schema with ISO-week structure
- **002**: Coach/athlete role-based access control; multi-athlete coach workspace with athlete picker and session isolation
- **003**: Training session CRUD (create, update, delete) with optimistic UI; sport-specific type fields (run, cycling, strength, yoga, mobility, swimming, rest day, walk/hike)
- **004-settings-strava**: Settings page with profile management and Strava OAuth integration; avatar upload via Supabase Storage; week-selector navigation
- **005-tests-refactor**: Vitest test suite covering date utilities, week-view computation, row mappers, and data-layer integration; codebase refactor (mock-data split, SessionForm extraction); URL-based locale routing with `/pl/` and `/en/` prefixes; Polish as default language; automated changelog with release-it
