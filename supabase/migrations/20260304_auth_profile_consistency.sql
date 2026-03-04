-- Auth/profile consistency baseline migration
-- Safe to run multiple times.

alter table if exists public.profiles
add column if not exists nickname text;

alter table if exists public.profiles
enable row level security;

do $$
begin
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
end
$$;
