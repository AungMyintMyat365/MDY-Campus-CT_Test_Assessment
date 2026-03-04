-- Verify/fix auth/profile setup for one environment.
-- Update these values before running in Supabase SQL Editor.

do $$
declare
  v_center_lead_user_id uuid := null; -- Example: '11111111-2222-3333-4444-555555555555'
  v_center_lead_email text := null; -- Example: 'lead@school.com'
  v_center_lead_name text := 'Center Lead';
  v_center_lead_nickname text := 'Lead';
begin
  -- 1) Ensure schema + policy baseline exists.
  alter table if exists public.profiles
  add column if not exists nickname text;

  alter table if exists public.profiles
  enable row level security;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_self_read'
  ) then
    create policy profiles_self_read on public.profiles
    for select using (id = auth.uid());
  end if;

  -- 2) Resolve center lead user id from email when only email is provided.
  if v_center_lead_user_id is null and v_center_lead_email is not null then
    select au.id into v_center_lead_user_id
    from auth.users au
    where lower(au.email) = lower(v_center_lead_email)
    limit 1;
  end if;

  -- 3) Ensure a center lead profile row exists for that auth user.
  if v_center_lead_user_id is not null then
    insert into public.profiles (id, role, full_name, nickname, email, is_active)
    values (
      v_center_lead_user_id,
      'center_lead',
      v_center_lead_name,
      v_center_lead_nickname,
      v_center_lead_email,
      true
    )
    on conflict (id) do update
    set role = 'center_lead',
        full_name = excluded.full_name,
        nickname = coalesce(excluded.nickname, public.profiles.nickname),
        email = coalesce(excluded.email, public.profiles.email),
        is_active = true;
  end if;
end
$$;

-- Verification output
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'nickname';

select policyname, permissive, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and policyname = 'profiles_self_read';

select id, role, full_name, nickname, email, is_active
from public.profiles
where role = 'center_lead'
order by created_at desc;
