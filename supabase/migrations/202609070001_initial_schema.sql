-- Slate Sites initial schema
-- Run this migration in the Supabase SQL editor or through the Supabase CLI.

create extension if not exists pgcrypto;

create type public.project_status as enum (
  'draft',
  'submitted',
  'in_review',
  'needs_changes',
  'approved',
  'building',
  'preview_ready',
  'published',
  'archived'
);

create type public.login_source as enum ('direct', 'slate');
create type public.site_visibility as enum ('private', 'preview', 'public');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null check (char_length(trim(business_name)) between 2 and 120),
  business_type text,
  location text,
  contact_email text,
  contact_phone text,
  status public.project_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  business_story text,
  primary_goal text,
  website_copy text,
  important_links text,
  tone text,
  color_preference text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.design_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  provider text not null default 'dribbble',
  url text not null check (url ~ '^https://'),
  notes text,
  created_at timestamptz not null default now()
);

create table public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  created_at timestamptz not null default now()
);

create table public.site_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content jsonb not null default '{}'::jsonb,
  visibility public.site_visibility not null default 'private',
  preview_url text,
  published_url text,
  created_at timestamptz not null default now(),
  unique(project_id, version_number)
);

create table public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source public.login_source not null,
  created_at timestamptz not null default now()
);

-- Created only by Slate's server-to-server handoff endpoint. The opaque UUID,
-- not an email address, is ever placed in the browser URL.
create table public.slate_handoffs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  slate_user_reference text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  authenticated_user_id uuid references public.profiles(id) on delete set null
);

create table public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects(owner_id);
create index project_assets_project_id_idx on public.project_assets(project_id);
create index project_activity_project_id_idx on public.project_activity(project_id, created_at desc);
create index login_events_user_id_idx on public.login_events(user_id, created_at desc);
create index slate_handoffs_expiry_idx on public.slate_handoffs(expires_at) where consumed_at is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute procedure public.set_updated_at();
create trigger project_briefs_updated_at before update on public.project_briefs
  for each row execute procedure public.set_updated_at();

-- Security-definer helper prevents RLS recursion in child-table policies.
create or replace function public.owns_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects where id = project_uuid and owner_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_briefs enable row level security;
alter table public.design_references enable row level security;
alter table public.project_assets enable row level security;
alter table public.site_versions enable row level security;
alter table public.project_activity enable row level security;
alter table public.login_events enable row level security;
alter table public.slate_handoffs enable row level security;

create policy "Users can read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Owners manage their projects" on public.projects
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners manage project briefs" on public.project_briefs
  for all to authenticated using (public.owns_project(project_id))
  with check (public.owns_project(project_id));
create policy "Owners manage design references" on public.design_references
  for all to authenticated using (public.owns_project(project_id))
  with check (public.owns_project(project_id));
create policy "Owners manage asset records" on public.project_assets
  for all to authenticated using (public.owns_project(project_id))
  with check (public.owns_project(project_id));
create policy "Owners can view site versions" on public.site_versions
  for select to authenticated using (public.owns_project(project_id));
create policy "Owners can view project activity" on public.project_activity
  for select to authenticated using (public.owns_project(project_id));

-- Login events and Slate handoffs are written only by server routes using the
-- service-role key. No browser client can read the underlying data.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf', 'video/mp4']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners can view project assets" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-assets'
    and public.owns_project((storage.foldername(name))[1]::uuid)
  );
create policy "Owners can upload project assets" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-assets'
    and public.owns_project((storage.foldername(name))[1]::uuid)
  );
create policy "Owners can delete project assets" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-assets'
    and public.owns_project((storage.foldername(name))[1]::uuid)
  );
