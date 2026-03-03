# CT Assessment Platform

Starter implementation for the school assessment system.

## Stack
- React (Vite)
- Supabase (Auth, Postgres, RLS)
- Supabase Edge Functions

## Setup
1. Copy `.env.example` to `.env` and set your Supabase values.
2. Install dependencies:
   - `npm install`
3. Start frontend:
   - `npm run dev`

## Supabase Setup
1. Create a Supabase project.
2. Run SQL from `supabase/schema.sql`.
3. Optionally run `supabase/seed.sql` after replacing coach IDs.
4. Deploy edge function stubs from `supabase/functions/*`.

## Current Status
Implemented:
- Role-based React routing and login UI
- Supabase client wiring
- Core schema and RLS baseline
- Edge function stubs for account creation, transfers, and CSV imports

Pending next:
- Complete secure role checks in edge functions
- Add full pages (coaches, classes, assessments, results)
- Add CSV upload UI and validation
- Add automated tests
