-- Waymark schema.
-- Auth (emails, password hashes, sessions) is owned by Supabase in auth.users.
-- public.profiles holds what the app adds on top: the role.

create type public.user_role as enum ('Admin', 'User');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  role       public.user_role not null default 'User',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Every new auth user gets a free profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when a user changes their email.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- security definer so it can be used inside profiles' own RLS policy without recursion.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  );
$$;

-- Called by the solver service with the user's JWT: true for any signed-in user with a profile.
create function public.has_solver_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
  );
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.has_solver_access() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_solver_access() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Clients may only READ. Every write (role, user management) goes through
-- Edge Functions using the service role, so a user can never make
-- themselves Admin.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "Users read their own profile, admins read all"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

revoke insert, update, delete on public.profiles from anon, authenticated;
revoke all on public.profiles from anon;
