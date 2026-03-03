create extension if not exists pgcrypto;

create type app_role as enum ('center_lead', 'coach', 'coder');
create type enrollment_status as enum ('active', 'moved_out');
create type result_status as enum ('pending', 'submitted', 'graded');
create type import_type as enum ('coach_import', 'coder_import');
create type import_status as enum ('queued', 'processing', 'completed', 'failed');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null,
  full_name text not null,
  email text unique,
  coder_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coder_identity_check check (
    (role = 'coder' and coder_id is not null) or (role <> 'coder')
  )
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coach_id uuid not null references public.profiles(id) on delete restrict,
  day_of_week text not null,
  start_time time not null,
  duration_minutes int not null default 90,
  created_at timestamptz not null default now()
);

create table if not exists public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  coder_id uuid not null references public.profiles(id) on delete cascade,
  status enrollment_status not null default 'active',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint one_active_enrollment unique (class_id, coder_id, status)
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  google_form_url text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  coder_id uuid references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  constraint assignment_target_xor check ((class_id is null) <> (coder_id is null))
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
  coder_id uuid not null references public.profiles(id) on delete cascade,
  status result_status not null default 'pending',
  score numeric,
  max_score numeric,
  submitted_at timestamptz,
  graded_at timestamptz,
  graded_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.coder_transfers (
  id uuid primary key default gen_random_uuid(),
  coder_id uuid not null references public.profiles(id) on delete cascade,
  from_class_id uuid not null references public.classes(id) on delete restrict,
  to_class_id uuid not null references public.classes(id) on delete restrict,
  moved_by uuid not null references public.profiles(id) on delete restrict,
  moved_at timestamptz not null default now(),
  reason text
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  type import_type not null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  status import_status not null default 'queued',
  summary jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_classes_coach_id on public.classes (coach_id);
create index if not exists idx_class_enrollments_class_coder_status on public.class_enrollments (class_id, coder_id, status);
create index if not exists idx_assessment_assignments_class_coder on public.assessment_assignments (class_id, coder_id);
create index if not exists idx_assessment_results_coder_status on public.assessment_results (coder_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.current_role()
returns app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_center_lead()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_role() = 'center_lead', false);
$$;

create or replace function public.is_coach_of_class(p_class_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and c.coach_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_assignments enable row level security;
alter table public.assessment_results enable row level security;
alter table public.coder_transfers enable row level security;
alter table public.import_jobs enable row level security;

create policy profiles_center_lead_all on public.profiles
for all using (public.is_center_lead()) with check (public.is_center_lead());

create policy profiles_self_read on public.profiles
for select using (id = auth.uid());

create policy profiles_self_update on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_coach_read_own_coders on public.profiles
for select using (
  role = 'coder' and exists (
    select 1
    from public.class_enrollments ce
    join public.classes c on c.id = ce.class_id
    where ce.coder_id = profiles.id
      and ce.status = 'active'
      and c.coach_id = auth.uid()
  )
);

create policy classes_center_lead_all on public.classes
for all using (public.is_center_lead()) with check (public.is_center_lead());

create policy classes_coach_rw_own on public.classes
for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy classes_coder_read_enrolled on public.classes
for select using (
  exists (
    select 1 from public.class_enrollments ce
    where ce.class_id = classes.id
      and ce.coder_id = auth.uid()
      and ce.status = 'active'
  )
);

create policy enrollments_center_lead_all on public.class_enrollments
for all using (public.is_center_lead()) with check (public.is_center_lead());

create policy enrollments_coach_rw_own_class on public.class_enrollments
for all using (public.is_coach_of_class(class_id)) with check (public.is_coach_of_class(class_id));

create policy enrollments_coder_read_self on public.class_enrollments
for select using (coder_id = auth.uid());

create policy assessments_center_lead_all on public.assessments
for all using (public.is_center_lead()) with check (public.is_center_lead());

create policy assessments_coach_rw_owner on public.assessments
for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy assessments_coder_read_assigned on public.assessments
for select using (
  exists (
    select 1
    from public.assessment_assignments aa
    where aa.assessment_id = assessments.id
      and (
        aa.coder_id = auth.uid() or
        aa.class_id in (
          select class_id
          from public.class_enrollments
          where coder_id = auth.uid() and status = 'active'
        )
      )
  )
);

create policy assignments_center_lead_all on public.assessment_assignments
for all using (public.is_center_lead()) with check (public.is_center_lead());

create policy assignments_coach_rw_scope on public.assessment_assignments
for all using (
  assigned_by = auth.uid()
  or (class_id is not null and public.is_coach_of_class(class_id))
)
with check (
  assigned_by = auth.uid()
  or (class_id is not null and public.is_coach_of_class(class_id))
);

create policy assignments_coder_read_self on public.assessment_assignments
for select using (
  coder_id = auth.uid()
  or class_id in (
    select class_id
    from public.class_enrollments
    where coder_id = auth.uid() and status = 'active'
  )
);

create policy results_center_lead_all on public.assessment_results
for all using (public.is_center_lead()) with check (public.is_center_lead());

create policy results_coach_rw_scope on public.assessment_results
for all using (
  exists (
    select 1
    from public.class_enrollments ce
    join public.classes c on c.id = ce.class_id
    where ce.coder_id = assessment_results.coder_id
      and ce.status = 'active'
      and c.coach_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.class_enrollments ce
    join public.classes c on c.id = ce.class_id
    where ce.coder_id = assessment_results.coder_id
      and ce.status = 'active'
      and c.coach_id = auth.uid()
  )
);

create policy results_coder_read_self on public.assessment_results
for select using (coder_id = auth.uid());

create policy transfers_center_lead_all on public.coder_transfers
for all using (public.is_center_lead()) with check (public.is_center_lead());

create policy transfers_coach_read_own on public.coder_transfers
for select using (moved_by = auth.uid());

create policy import_jobs_center_lead_all on public.import_jobs
for all using (public.is_center_lead()) with check (public.is_center_lead());

create policy import_jobs_coach_read_own on public.import_jobs
for select using (uploaded_by = auth.uid());
