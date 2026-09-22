-- Server-owned permanent project deletion.
-- Apply after 202609110001_site_workspace.sql.

begin;

-- This row deliberately has no foreign key to projects. It survives the
-- project cascade so a failed or partial Storage cleanup can be retried after
-- the public site and owner workspace record have already disappeared.
create table if not exists public.project_deletion_cleanup (
  project_id uuid primary key,
  actor_id uuid not null,
  state text not null default 'pending' check (state in ('pending','complete')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  last_attempt_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.project_deletion_cleanup enable row level security;
create index if not exists project_deletion_cleanup_actor
  on public.project_deletion_cleanup(actor_id, state, updated_at desc);
revoke all on table public.project_deletion_cleanup from public, anon, authenticated;
grant select, insert, update on table public.project_deletion_cleanup to service_role;

-- An editor left open in another tab must not recreate a deleted project via
-- the brief upsert. Serialize INSERT/UPSERT and deletion before inspecting the
-- tombstone, so a concurrent autosave cannot race the deletion transaction.
create or replace function public.slate_reject_deleted_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('slate-project-lifecycle:' || new.id::text));
  if exists (select 1 from public.project_deletion_cleanup where project_id = new.id) then
    raise exception 'DELETED_PROJECT';
  end if;
  return new;
end $$;
revoke all on function public.slate_reject_deleted_project() from public, anon, authenticated;
drop trigger if exists slate_reject_deleted_project on public.projects;
create trigger slate_reject_deleted_project before insert on public.projects
  for each row execute function public.slate_reject_deleted_project();

-- Browser clients may still read and edit their own projects, but permanent
-- deletion must pass through the server route so private Storage objects are
-- cleaned as well.
drop policy if exists "Owners manage their projects" on public.projects;
drop policy if exists "Owners can read their projects" on public.projects;
drop policy if exists "Owners can create projects" on public.projects;
drop policy if exists "Owners can update their projects" on public.projects;

create policy "Owners can read their projects" on public.projects
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can create projects" on public.projects
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners can update their projects" on public.projects
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create or replace function public.slate_delete_project(p_project uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cleanup_actor uuid;
begin
  perform pg_advisory_xact_lock(hashtext('slate-project-lifecycle:' || p_project::text));
  -- This uses the same project-row lock as generation start/append, preventing a
  -- new generation from beginning between the active-job check and deletion.
  perform 1 from public.projects where id = p_project and owner_id = p_actor for update;
  if not found then raise exception 'NOT_OWNER'; end if;

  update public.site_generation_jobs
    set state = 'failed', phase = 'failed', error_message = 'Generation lease expired before project deletion'
    where project_id = p_project and state = 'running' and expires_at <= now();
  if exists (
    select 1 from public.site_generation_jobs
    where project_id = p_project and state = 'running' and expires_at > now()
  ) then
    raise exception 'GENERATION_BUSY';
  end if;

  -- A completed row is retained as an idempotency tombstone. Refuse to reuse a
  -- public project UUID that still belongs to a different owner's cleanup.
  select actor_id into cleanup_actor from public.project_deletion_cleanup
    where project_id = p_project for update;
  if found and cleanup_actor is distinct from p_actor then
    raise exception 'DELETE_CLEANUP_CONFLICT';
  end if;

  insert into public.project_deletion_cleanup(project_id, actor_id)
    values(p_project, p_actor)
    on conflict(project_id) do update set
      actor_id = excluded.actor_id,
      state = 'pending',
      attempts = 0,
      last_error = null,
      last_attempt_at = null,
      completed_at = null,
      updated_at = now();

  delete from public.projects where id = p_project and owner_id = p_actor;
end $$;

revoke all on function public.slate_delete_project(uuid,uuid) from public, anon, authenticated;
grant execute on function public.slate_delete_project(uuid,uuid) to service_role;

commit;
