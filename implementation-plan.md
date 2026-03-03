# Implementation Plan

## 1) Goal
Build a zero-cost web platform for school assessments with 3 roles:
- Center Lead: full access, creates coach accounts, monitors all classes/coders.
- Coach: manages own classes/coders, assigns assessments, tracks progress, can move coders across classes.
- Coder (student): logs in with coder ID + password, sees assigned assessments and marks.

Tech constraints:
- Frontend: React
- Backend: JavaScript
- Database/Auth: Supabase
- Target: handle ~500 concurrent users
- Budget: 0 cost

## 2) MVP Scope (Phase 1)
Must-have features:
1. Authentication and role-based access (Center Lead / Coach / Coder)
2. Class and coder management
3. Assessment assignment using Google Form links
4. Submission/mark recording and progress tracking
5. Import coach and coder lists from spreadsheet CSV
6. Timetable storage and display

Out of scope for MVP (Phase 2+):
- Advanced analytics, notifications, parent portal, mobile app

## 3) High-Level Architecture
- React app (single frontend)
- Supabase Auth for login/session
- Supabase Postgres for data
- Supabase Row Level Security (RLS) for authorization
- Supabase Edge Functions (JavaScript) for privileged operations

Flow:
- User logs in -> role loaded -> role-based routes and data queries
- All reads/writes go through RLS-protected tables
- Sensitive operations (bulk import, account creation, move logic) go through Edge Functions

## 4) Data Model (Supabase)
Use UUID primary keys unless noted.

### Core tables
1. `profiles`
- `id` (uuid, references auth user)
- `role` (enum: `center_lead`, `coach`, `coder`)
- `full_name` (text)
- `email` (text, nullable for coder)
- `coder_id` (text, unique, nullable for non-coder)
- `is_active` (bool, default true)
- `created_at`, `updated_at`

2. `classes`
- `id`
- `name` (text)
- `coach_id` (uuid -> profiles.id, role coach)
- `day_of_week` (text)
- `start_time` (time)
- `duration_minutes` (int default 90)
- `created_at`

3. `class_enrollments`
- `id`
- `class_id` (uuid -> classes.id)
- `coder_id` (uuid -> profiles.id, role coder)
- `status` (enum: `active`, `moved_out`)
- `joined_at`
- `left_at` (nullable)

4. `assessments`
- `id`
- `title` (text)
- `description` (text)
- `google_form_url` (text)
- `created_by` (uuid -> profiles.id)
- `created_at`

5. `assessment_assignments`
- `id`
- `assessment_id` (uuid)
- `class_id` (uuid, nullable)
- `coder_id` (uuid, nullable)
- `assigned_by` (uuid -> profiles.id)
- `assigned_at`
- `due_at` (timestamp, nullable)

Rule: exactly one target required (`class_id` xor `coder_id`).

6. `assessment_results`
- `id`
- `assignment_id` (uuid -> assessment_assignments.id)
- `coder_id` (uuid -> profiles.id)
- `status` (enum: `pending`, `submitted`, `graded`)
- `score` (numeric, nullable)
- `max_score` (numeric, nullable)
- `submitted_at` (timestamp, nullable)
- `graded_at` (timestamp, nullable)
- `graded_by` (uuid, nullable)

7. `coder_transfers` (audit)
- `id`
- `coder_id`
- `from_class_id`
- `to_class_id`
- `moved_by`
- `moved_at`
- `reason` (text, nullable)

8. `import_jobs` (audit)
- `id`
- `type` (enum: `coach_import`, `coder_import`)
- `uploaded_by`
- `status` (enum: `queued`, `processing`, `completed`, `failed`)
- `summary` (jsonb)
- `created_at`, `finished_at`

## 5) Timetable Seed
Create classes with schedule options:
- Saturday: 10:00, 13:00, 14:30, 16:00
- Sunday: 10:00, 13:00, 14:30, 16:00
- Wednesday: 16:00
- Thursday: 16:00
- Friday: 16:00
Duration: 90 minutes each.

## 6) Authentication Design
- Center Lead + Coach: email/password via Supabase Auth
- Coder login requirement: coder ID + password

Recommended secure approach:
- Store coder accounts in Supabase Auth too.
- For coders, use generated email alias like `coder_<coder_id>@school.local` (internal only) and login UI accepts coder ID/password, then backend maps coder_id -> auth email before sign-in.
- Never store plaintext passwords in custom tables.

## 7) Authorization (RLS) Rules
Enable RLS on all application tables.

Policy goals:
1. Center Lead can read/write all rows.
2. Coach can read/update only:
- Their own classes
- Enrollments in their classes
- Results for coders in their classes
- Assessments/assignments they created (or assigned to their classes)
3. Coder can read only:
- Their own profile
- Their own assignments/results
- Class info for classes they are currently enrolled in
4. Only Center Lead can create coach accounts.
5. Coach can create coder accounts only for their classes.
6. Transfer operation must be function-based with checks and audit write.

## 8) API / Edge Functions
Implement these server-side functions first:
1. `create_coach_account`
- Input: name, email, temp_password
- Auth: center_lead only

2. `create_coder_account`
- Input: coder_id, name, class_id, temp_password
- Auth: coach (own class) or center_lead

3. `move_coder_class`
- Input: coder_profile_id, to_class_id, reason
- Auth: coach or center_lead
- Logic: enforce source access, close old enrollment, create new enrollment, log `coder_transfers`

4. `import_coaches_csv`
5. `import_coders_csv`
- Validate schema, dedupe by email/coder_id, upsert safely, return summary report

## 9) Frontend Structure (React)
Suggested pages:
- `/login` (tabs: Coach/CenterLead, Coder)
- `/cl/dashboard`
- `/cl/coaches`
- `/cl/classes`
- `/coach/dashboard`
- `/coach/coders`
- `/coach/assessments`
- `/coach/transfers`
- `/coder/dashboard`
- `/coder/assessments`
- `/coder/results`

Core UI components:
- Role guard and route guard
- Tables with search/filter
- Assignment modal
-Assement Result will get data from google sheet
- Transfer modal
- CSV import panel with validation errors

## 10) Security Checklist (Required)
1. RLS enabled on every table
2. No service-role key in frontend
3. Password policy (minimum length + complexity)
4. Rate limit sign-in and edge function endpoints
5. Input validation (schema validation on all function payloads)
6. Audit logs for account creation, transfer, import
7. Use HTTPS-only deployment
8. Restrict CORS to your frontend domain
9. Session timeout + secure cookie defaults
10. Regular backups/export policy for critical tables

## 11) Performance and Scale (~500 concurrent)
- Add indexes:
- `classes(coach_id)`
- `class_enrollments(class_id, coder_id, status)`
- `assessment_assignments(class_id, coder_id)`
- `assessment_results(coder_id, status)`
- Paginate large lists (limit/offset or cursor)
- Avoid N+1 queries in frontend
- Use selective columns (no `select *` in production)

500 concurrent users is realistic for an MVP on Supabase + static React if queries are indexed and pages are paginated.

## 12) 0-Cost Deployment Plan
- Frontend: Vercel/Netlify free tier
- Backend/DB/Auth: Supabase free tier
- File import: CSV uploads (small size limits)
- Monitoring: Supabase dashboard + simple app logs

Note: free tiers have quotas. Track usage and set alerts.

## 13) Build Timeline (Practical)
Week 1:
1. Project setup, schema creation, RLS scaffolding
2. Auth flows for all roles
3. Basic dashboards and protected routing

Week 2:
1. Class/coder management
2. Assessment create/assign/track
3. Transfer workflow + audit log

Week 3:
1. CSV import pipeline
2. Security hardening and testing
3. Deployment + UAT fixes

## 14) Acceptance Criteria
1. Center Lead can create coach accounts and manage all classes.
2. Coach sees only own classes/coders and can assign assessments.
3. Coder can log in with coder ID/password and only view own data.
4. Transfers between classes work and are auditable.
5. CSV imports for coaches/coders work with error reporting.
6. RLS prevents cross-role data leakage.

## 15) Immediate Next Step
After your review, I will scaffold the project inside `A:\Coding\CT Test` with:
1. React frontend app
2. Supabase config and SQL schema files
3. Edge Function stubs for account creation/import/transfer
4. Starter role-based routes and login screens
