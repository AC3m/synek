# Changelog

## [0.4.1](https://github.com/AC3m/synek/compare/v0.4.0...v0.4.1) (2026-03-27)

### Bug Fixes

* resolve strength session exercise data loss and React Query issues ([4b3336b](https://github.com/AC3m/synek/commit/4b3336bbb98a30f1563683ea6a20563f2766259d))

## [0.4.0](https://github.com/AC3m/synek/compare/v0.3.1...v0.4.0) (2026-03-26)

### Features

* strength workout module with variant library and session logging ([2dda932](https://github.com/AC3m/synek/commit/2dda932b1f11ed149674e0e480bcde97eaac683e))

### Bug Fixes

* coach strength library shows athlete variants when athlete is selected ([986d6af](https://github.com/AC3m/synek/commit/986d6af8682919094e248bb5b20629458123dc28))
* scope strength variant cache by userId, add coach RLS policies ([c472486](https://github.com/AC3m/synek/commit/c47248685c25038d62c4157705ccf775dfc67557))

## [0.3.1](https://github.com/AC3m/synek/compare/v0.3.0...v0.3.1) (2026-03-26)

## [0.3.0](https://github.com/AC3m/synek/compare/v0.2.0...v0.3.0) (2026-03-19)

### Features

* add interval lap breakdown to run session cards ([f86d5fb](https://github.com/AC3m/synek/commit/f86d5fb5551a761cd3a453456732801f15f5e0ec))
* add session detail modal and simplify existing UJ ([7fa41da](https://github.com/AC3m/synek/commit/7fa41da004971e1529040998b19247e0cd05595b))
* back-fill week stats from Garmin workout data ([e660feb](https://github.com/AC3m/synek/commit/e660febcb7f167f11c70393e7e524249081ece77))
* contextual pace chip with Zap icon and form hint for interval runs ([db4aa49](https://github.com/AC3m/synek/commit/db4aa496088a3ce79d74410aad6d7df02063ecb7))
* integrate junction/graming poc on the FE ([abab741](https://github.com/AC3m/synek/commit/abab7414926377016832f9d885579e6ce26b84f6))
* integrate junction/graming poc to receive raw workout webhooks ([346ed31](https://github.com/AC3m/synek/commit/346ed31e7317bc14f7556adfcfd34bb483f407de))
* multi-week planning view with copy, DnD reorder, and history ([db39671](https://github.com/AC3m/synek/commit/db39671814d97d1fe1e5c8b4ee0a0648ef4c3916))
* multi-week view UI polish — animations, dialogs, and UX fixes ([0052237](https://github.com/AC3m/synek/commit/0052237f56150114d6030c863f4c03b75f7ca21b))
* per-session Strava sync and unified StravaActionsBar ([e341ad5](https://github.com/AC3m/synek/commit/e341ad53909b64154f3bd0c18af984f800cf8acb))
* unified loading experience with stagger animations ([b70687e](https://github.com/AC3m/synek/commit/b70687e7de5f66e9224541d492d538d9dae877b0))

### Bug Fixes

* add missing Polish plural forms for history session count ([b17122b](https://github.com/AC3m/synek/commit/b17122b666dce06fe05df2807a41bb4e2639dbeb))
* add small padding to show calendar edges ([f0e423a](https://github.com/AC3m/synek/commit/f0e423a547f4958f3faed680dda779f13ff4447d))

## 0.2.0 (2026-03-14)

### Features

* add background token refresh service via pg_cron ([1f116df](https://github.com/AC3m/synek/commit/1f116dfe9dfcef4371acbe9a4b120a741160c55d))
* add bulk confirm rpc for strava sessions ([b615805](https://github.com/AC3m/synek/commit/b615805b8a0527d7f4afd8bcd743ea4fb739fb5f))
* add dark mode and athlete performance update ([35a6523](https://github.com/AC3m/synek/commit/35a6523821101bae34d6e1f432834ef66d3b62a7))
* add floating action bar for bulk strava session confirmation ([1203c06](https://github.com/AC3m/synek/commit/1203c06e2855c503ea617d21e97ce81dd182fd0d))
* add settings page with profile management and Strava integration ([2015dab](https://github.com/AC3m/synek/commit/2015dab8c9efc6b0eb0f8cdd577b86b29d33ed1b))
* add Strava Sync CTA to athlete week view and session cards ([95a89aa](https://github.com/AC3m/synek/commit/95a89aafac274bc7ebc51347406f7aad62763457))
* add strava webhook edge function ([2cbb489](https://github.com/AC3m/synek/commit/2cbb48941d3668bffd751f4037274b5bbddb9cc1))
* add Vitest test suite, mock-data refactor, URL locale routing, and changelog automation ([2cd6732](https://github.com/AC3m/synek/commit/2cd6732932f60d08cec51d7c0829fe65d12e3521))
* add WeekSummary enhancements — collapsible card, Run KM, Total Time ([d94879b](https://github.com/AC3m/synek/commit/d94879bfc741cb8b8cdf66af5766bd6c2d997524))
* athlete self-planning and coach personal profile ([b694328](https://github.com/AC3m/synek/commit/b6943288a75d3cc8985f14a7be24388377217cf4))
* auth-based role management with coach/athlete login ([296885e](https://github.com/AC3m/synek/commit/296885e48935e6c86baf8c87a55f12bb53fc1605))
* calendar UX improvements — today highlight, nav padding, header layout ([0984c9f](https://github.com/AC3m/synek/commit/0984c9feb9a384305e4f3394bba18cf053b8792e))
* coach-athlete invite flow, coach registration, and account deletion ([552ada7](https://github.com/AC3m/synek/commit/552ada7586b5b6b615308add30a5ac9bbaabf95b))
* create Synek app and connect it to Supabase ([3b0f882](https://github.com/AC3m/synek/commit/3b0f882e498dab42405dfbd508e3f1dfa4340f85))
* implement strava ui compliance and confirmation flow ([1b2abee](https://github.com/AC3m/synek/commit/1b2abee05b06b8c44ebb1224bbdb56fa20ebf7f5))
* integrate the app with Vercel ([30bb8e2](https://github.com/AC3m/synek/commit/30bb8e2fb8b5176b54b79c0857aacfa33bd8e1cc))
* landing page with registration flow and unified nav controls ([f8a7b92](https://github.com/AC3m/synek/commit/f8a7b92b02972efddf9c628e3a751a3737616286)), closes [#section](https://github.com/AC3m/synek/issues/section)
* migrate the google sheet data for archee user and extend performance data ([cee6279](https://github.com/AC3m/synek/commit/cee6279ee274304992eb2c9d67c3d89527566612))
* move strava attribution to under the results for better contextual placement ([ac33219](https://github.com/AC3m/synek/commit/ac33219ad573fe9870f2a72f5f41eeb4cd97e561))
* redesign UI with mobile nav, fix feedback form RLS and success state ([2f90ad3](https://github.com/AC3m/synek/commit/2f90ad3ce5ff7f634adafee2b3e5d868a5f97c7a))
* refine UI, fix navigation bugs and update branded assets ([2184e7f](https://github.com/AC3m/synek/commit/2184e7fa7ad22ddda046d27395e9c08685e9488d))
* Strava sync fixes, week selector, UI polish ([37b497d](https://github.com/AC3m/synek/commit/37b497d295b77ac0824af7cddcf8dacc812ddc3d))
* update landing page on strava status ([487cf44](https://github.com/AC3m/synek/commit/487cf44765334d1873f1c6d2b89b6afc41c9f1b2))
* use official strava assets and improve responsiveness of branding elements ([6740b83](https://github.com/AC3m/synek/commit/6740b831ddff87dc1af4f7ba7c1132a6d61548ca))

### Bug Fixes

* add optimistic update to strava confirm hook to resolve UI unresponsiveness ([d6ddb32](https://github.com/AC3m/synek/commit/d6ddb324c1768bf1f7a77ac324d461ed2acff48b))
* implement strava confirmation in mock mode ([9d697fe](https://github.com/AC3m/synek/commit/9d697fed89ba128184c66ed710662abab96a437b))
* implement strava confirmation logic and refine branding UI ([32726ae](https://github.com/AC3m/synek/commit/32726aee36e817f7b3f6fac7584516fe30a5183a))
* improve mobile layout across landing page ([ba6f1f7](https://github.com/AC3m/synek/commit/ba6f1f77e1b22d7ec86a22e8191c55db1952de8c))
* keep week skeleton visible until sessions load ([58a7e47](https://github.com/AC3m/synek/commit/58a7e473d74ceabf78d341cf9d47a70ec1f99a3b))
* make mobility training sync ([0b2e55e](https://github.com/AC3m/synek/commit/0b2e55eda0c1df5a72fcad99e3eaefb752468669))
* move strava confirmation flag to training_sessions table so UI can fetch it correctly ([f21151b](https://github.com/AC3m/synek/commit/f21151b881e8fe74fd1339b2f534b4b412e3355f))
* offload the hero section ([226bb5c](https://github.com/AC3m/synek/commit/226bb5c74adb6a0765490316b4a680ffb487edca))
* only apply blur masking to sessions that originated from Strava ([967bfc6](https://github.com/AC3m/synek/commit/967bfc61332fe879a2e5a04207959aacd2bd2fc1))
* remove loader flash, Sync Now header button, and update login logo ([632e6b5](https://github.com/AC3m/synek/commit/632e6b5b5e363a90b2d781c14b81dd98dc3cd713))
* resolve ReferenceError by destructuring onConfirmStrava in WeekGrid and implement in CoachWeekView ([00e351c](https://github.com/AC3m/synek/commit/00e351c9c9b63f2276b8c445b6befd736bcecb44))
* resolve ReferenceError by importing bulkConfirmStravaSessions ([c870fe2](https://github.com/AC3m/synek/commit/c870fe29eb460b736a99380e72cf2ab4c6e73913))
* resolve RPC authorization issue by removing security definer and correcting auth check ([a53c481](https://github.com/AC3m/synek/commit/a53c48158de509334271101c3689b1b305ad863a))
* resolve sql migration relation and naming errors for remote push ([f27b113](https://github.com/AC3m/synek/commit/f27b1130f871ed6731b53ff14f7d845d9c369e3d))
* resolve strava attribution responsiveness and resize connect button ([1bbc10d](https://github.com/AC3m/synek/commit/1bbc10ddf53ccdfdc55ec515d7ad5e43d4bcc2f5))
* update mobile bottom bar and athlete context of coach layout ([641fa17](https://github.com/AC3m/synek/commit/641fa17119b620c6cbf1e3e0d5367fa59a66bf8b))
* use VITE_APP_URL for Strava redirect_uri and deploy edge functions without JWT verification ([e28afb6](https://github.com/AC3m/synek/commit/e28afb69450b9a88b850d0e223774fabf8cf5050))

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-09

### Features

- **001-sheets-data-migration**: Imported historical training data from Google Sheets into Supabase; established `week_plans` and `training_sessions` schema with ISO-week structure
- **002**: Coach/athlete role-based access control; multi-athlete coach workspace with athlete picker and session isolation
- **003**: Training session CRUD (create, update, delete) with optimistic UI; sport-specific type fields (run, cycling, strength, yoga, mobility, swimming, rest day, walk/hike)
- **004-settings-strava**: Settings page with profile management and Strava OAuth integration; avatar upload via Supabase Storage; week-selector navigation
- **005-tests-refactor**: Vitest test suite covering date utilities, week-view computation, row mappers, and data-layer integration; codebase refactor (mock-data split, SessionForm extraction); URL-based locale routing with `/pl/` and `/en/` prefixes; Polish as default language; automated changelog with release-it
