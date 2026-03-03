# Project Latest Situation (Easy Guide)

Date: March 3, 2026
Project: CT Assessment Platform

## Current State
- Frontend and backend foundation is mostly done.
- Login/profile debug improvements are in place.
- Coach create/import flow has stronger timeout and error handling in UI.
- Edge function CORS helper was hardened.
- Main blocker is still coach import/create behavior in browser flow.

## Fix First (Priority 1)
Problem: `Import Coaches` can stay in loading too long or fail in request flow.

Do this first:
1. Confirm browser request path with one clean test on `http://localhost:5173`.
2. Check Network for both `OPTIONS` and `POST` calls to coach import endpoint.
3. Match that with Supabase edge logs for the same click.
4. Keep `ALLOWED_ORIGIN` exactly `http://localhost:5173` after debug is stable.

Done when:
- Import returns success/failure summary in UI within timeout.
- No indefinite loading state.

## Then Do Next (Priority 2)
Problem: Ensure lead account/profile setup is always valid.

Steps:
1. Verify `profiles` row exists for each login user id.
2. Verify role is correct (`center_lead`, `coach`, `coder`).
3. Keep `nickname` column and self-read RLS policy consistent in all environments.

Done when:
- Login always routes by role without "no role/profile found".

## Then Build Next Features (Priority 3)
1. Assessments CRUD + assignment flow.
2. Results entry/view pages.
3. Lead monitoring filters/dashboard polish.
4. E2E tests for lead/coach/coder core path.

## Prompt-Style Next Task (copy/paste)
"Focus only on coach import/create reliability. Reproduce with one test CSV, capture browser Network (OPTIONS + POST) and matching Supabase function logs, then patch the exact failing layer and verify the UI returns a success/failure result within timeout."
