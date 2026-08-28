-- Multi-tenant foundation: organizations + memberships.
-- Every business table below is scoped by organization_id and protected by
-- Row Level Security, so one tenant's data is never visible or writable by
-- another tenant's users at the database layer (not just in application code).

create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists memberships_user_id_idx on memberships(user_id);
create index if not exists memberships_organization_id_idx on memberships(organization_id);

-- security definer + explicit search_path: safe to call from RLS policies
-- without exposing the memberships table itself (which has no direct SELECT
-- policy for arbitrary cross-org reads) and without risking search_path
-- hijacking.
create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where organization_id = p_organization_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(p_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- Atomically creates a new organization and makes the calling user its
-- owner. This is the only sanctioned way to create an organization: the
-- tables themselves have no direct INSERT policy for regular users, so an
-- organization can never exist without exactly one owner membership.
create or replace function public.create_organization_with_owner(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into organizations (name, slug) values (p_name, p_slug)
  returning id into v_org_id;

  insert into memberships (organization_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner');

  return v_org_id;
end;
$$;

grant execute on function public.create_organization_with_owner(text, text) to authenticated;

alter table organizations enable row level security;
alter table memberships enable row level security;

create policy "members can view their organizations"
  on organizations for select
  using (is_org_member(id));

create policy "members can view memberships in their organizations"
  on memberships for select
  using (is_org_member(organization_id));
