# Project Status Update - March 4, 2026

## Executive Summary
The project moved from unstable import-heavy workflows to a more reliable manual-operations baseline.
Core role-based flows exist for Center Lead, Coach, and Coder with working routes and UI pages.
Critical reliability work focused on auth/session handling, function CORS behavior, and reducing timeout-prone CSV flows.

## What Is Finished
1. Core app foundation
- React + Vite frontend and Supabase integration are in place.
- Role-based routing and protected pages are active.
- Login/debug path for missing profile/role is available.

2. Center Lead workflows
- Manage Coaches page is active with manual coach creation.
- Coach list display is active.
- Manage Classes page supports manual class creation.
- Class list and coder list visibility were added to Lead Classes page.

3. Coach workflows
- Manage Coders page supports manual coder creation.
- Coder move between classes is supported.
- Active coder list for coach classes is visible.

4. Edge function and backend hardening
- `create-coach-account` and `import-coaches-csv` functions were updated and deployed.
- Shared CORS helper was tightened and request-id support added.
- Function request/error handling and debugability improved.

5. Feature expansion pages (initial implementation)
- Assessments page added.
- Results page added.
- Lead monitoring page added.
- Routes/dashboard links were wired.

6. DB consistency tooling
- Added migration baseline for auth/profile consistency.
- Added bootstrap SQL for profile/nickname/RLS consistency checks.

7. Verification
- Automated tests pass (`npm test`).
- Production build passes (`npm run build`).

## What Is Not Finished
1. Reliable CSV bulk import in browser workflows
- Coach and coder CSV import proved unstable under session/network/runtime conditions.
- Current direction intentionally prioritizes manual entry for reliability.

2. Full production readiness
- No full E2E test suite for critical role journeys yet.
- Rate limiting and stronger centralized error observability are not finalized.

3. Full functional completion
- Assessments/results/monitoring pages are implemented but still need deeper validation against real school workflows and edge cases.

4. Environment consistency operations
- Some environments may still require manual profile/role fixes via SQL bootstrap.

## Current Known Risks
1. Session/JWT expiration during long actions can still interrupt workflows if user stays idle too long before submit.
2. Manual data setup in Supabase Dashboard/SQL is currently part of operational flow.
3. CSV import endpoints exist but are not currently the recommended production path.

## Recommended Next Implementation (In Order)
1. Stabilize manual core flow as “official path”
- Keep coach/class/coder creation and coder transfer as the primary supported flow.
- Add small UX safeguards (required field hints, duplicate checks, success toasts).

2. Complete functional QA for role journeys
- Lead: create coach -> create class -> monitor
- Coach: create coder -> move coder -> assign assessment -> record results
- Coder: login with coder ID -> view results

3. Harden assessments/results data behavior
- Validate assignment rules for class-vs-coder targeting.
- Validate result update/edit lifecycle and role permissions.

4. Add E2E regression tests
- Minimum scenarios: lead happy path, coach happy path, coder login/results read.
- Cover auth expiry behavior and missing profile row behavior.

5. Optional: reintroduce CSV import only after background-job architecture
- Move bulk imports to queue/background processing with progress polling and retry logic.
- Avoid synchronous browser request dependency for large imports.

## Supabase Operational Notes
- Confirm `ALLOWED_ORIGIN` remains set to `http://localhost:5173` in development.
- Use `supabase/bootstrap/verify_and_fix_profile_setup.sql` when profile-role inconsistencies appear.
- Manual onboarding pattern currently recommended:
  - create auth user in Supabase Auth
  - insert corresponding `profiles` row
  - link coder to class via `class_enrollments`

## Final Status (as of March 4, 2026)
- Project is in a stable manual-operation phase suitable for internal testing.
- Core role workflows are mostly functional.
- CSV bulk import is intentionally deprioritized until a proper async/background design is implemented.
- Next milestone should focus on E2E reliability and production hardening.
