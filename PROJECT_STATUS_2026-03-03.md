# Project Status Update - March 3, 2026

## Summary
This update moved the project from starter scaffolding to a functional MVP foundation with:
- Role-based pages for Center Lead and Coach workflows
- Secure edge functions for account creation, coder transfer, and CSV imports
- CSV upload UI for coach and coder bulk import
- Nickname support across UI and backend (`Full Name @ Nickname` for coder display)
- Automated tests for authorization helpers and CSV parser

## Completed Today
1. Frontend workflow expansion
- Added Lead routes/pages: manage coaches, manage classes
- Added Coach route/page: manage coders (create, move, import)
- Linked dashboards to management pages
- Added table/form UI styles and favicon setup

2. Backend security hardening
- Added shared auth helper for edge functions
- Enforced role checks in key functions:
  - `create-coach-account`
  - `create-coder-account`
  - `move-coder-class`
- Removed trust of client-controlled `moved_by`
- Added controlled CORS config (`ALLOWED_ORIGIN`)

3. CSV import implementation
- Implemented:
  - `import-coaches-csv`
  - `import-coders-csv`
- Added import job summary writing into `import_jobs`
- Added row-level failure capture in response summary
- Added flexible header support (e.g., `full_name` or `Full Name`)

4. Nickname rollout
- Added `nickname` to profile flow (DB + edge functions + UI)
- Manage Coach/Coder forms now require nickname
- Coder display now uses `Full Name @ Nickname`
- Added display helpers in frontend

5. Testing and validation
- Added Vitest and tests:
  - `tests/authz.test.ts`
  - `tests/csv.test.ts`
- Verified:
  - `npm test` passes
  - `npm run build` passes

6. Supabase deployment work completed
- Deployed edge functions to project: `pmpnkthuiluwnyioygdy`
- Updated function secret `ALLOWED_ORIGIN` for current local dev port

## Issues Seen and Current Status
1. Login shows "no role/profile found"
- Symptom: signed-in user could not load role profile
- Root causes encountered:
  - Profile row mismatch / missing policies / schema drift during setup
  - Temporary migration mismatch while adding `nickname`
- Current mitigation:
  - Added login debug details (auth email + auth user id)
  - Added profile query fallback in app if `nickname` column is missing
- Final fix expected in DB:
  - Ensure `profiles.nickname` exists
  - Ensure profile row exists for auth user id with `role = center_lead`
  - Ensure RLS self-read policy exists for authenticated users

2. Edge function 401 during import
- Symptom: `import-coaches-csv` returned non-2xx / 401
- Root causes encountered:
  - Invalid/expired login session
  - CORS allowed origin mismatch when Vite port changed
- Fixes applied:
  - Updated `ALLOWED_ORIGIN`
  - Improved function-side token validation path

3. CSV import appears to hang
- Observed when request fails before job row creation
- Mitigation:
  - Flexible header parser added
  - Recommended importing in small batches first
  - Check `import_jobs.summary` for exact row-level failures

## Recommended Immediate Next Steps
1. Stabilize auth/profile setup in DB
- Run one DB verification/fix script for:
  - `profiles.nickname` column
  - RLS policies on `profiles`
  - center lead profile row for current auth id

2. Verify end-to-end happy path
- Login as center lead
- Create one coach manually
- Import a 2-row coach CSV
- Confirm rows in `profiles`

3. Data model migration hygiene
- Convert current schema changes into formal SQL migration files
- Add a single "bootstrap" SQL script for new environments

4. Finish product features
- Assessments CRUD and assignment pages
- Results entry/view pages
- Center lead monitoring dashboard with filters

5. Add production-readiness items
- Function/API rate limiting strategy
- Better structured error reporting in UI
- E2E tests for lead/coach/coder core flows

## Current Project Status
- Frontend: partial MVP with real management flows for lead/coach
- Backend functions: mostly implemented for account/import/transfer
- Database: strong baseline schema + RLS, but environment consistency must be finalized
- Testing: basic automated test coverage added
- Overall: project is in active integration phase, close to stable internal testing once auth/profile setup is fully consistent
