-- Additive release migration. Run once in Supabase SQL Editor before deploying.
begin;

alter table public.project_briefs add column if not exists design_notes text;
alter table public.site_versions add column if not exists request_id uuid;
create unique index if not exists site_versions_request_unique on public.site_versions(project_id, request_id) where request_id is not null;

-- Freeze the best available business details for existing versions. Historical
-- pre-edit business values cannot be reconstructed from the original schema.
update public.site_versions v set content = v.content || jsonb_build_object('business', jsonb_build_object(
  'name', p.business_name, 'type', coalesce(p.business_type, ''), 'location', coalesce(p.location, ''),
  'email', coalesce(p.contact_email, ''), 'phone', coalesce(p.contact_phone, ''), 'whatsapp', ''
)) from public.projects p where p.id = v.project_id and not (v.content ? 'business');
with ranked as (
  select id, row_number() over (partition by project_id order by version_number desc) n
  from public.site_versions where visibility = 'public'
) update public.site_versions set visibility = 'private', published_url = null where id in (select id from ranked where n > 1);
create unique index if not exists one_live_version_per_project on public.site_versions(project_id) where visibility = 'public';

create or replace function public.freeze_site_version() returns trigger language plpgsql set search_path = public as $$
begin
  if new.content is distinct from old.content or new.project_id <> old.project_id or new.version_number <> old.version_number
    or new.created_at <> old.created_at or new.request_id is distinct from old.request_id then
    raise exception 'Site snapshots are immutable; append a new version';
  end if;
  return new;
end $$;
drop trigger if exists freeze_site_version on public.site_versions;
create trigger freeze_site_version before update on public.site_versions for each row execute function public.freeze_site_version();

create table if not exists public.site_generation_jobs (
  id uuid primary key, project_id uuid references public.projects(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  state text not null default 'running' check (state in ('running','completed','failed')),
  phase text not null default 'preparing', error_message text,
  version_id uuid references public.site_versions(id) on delete set null,
  created_at timestamptz not null default now(), expires_at timestamptz not null default (now() + interval '150 seconds')
);
alter table public.site_generation_jobs enable row level security;
create index if not exists generation_actor_time on public.site_generation_jobs(actor_id, created_at desc);

create or replace function public.slate_start_generation(p_project uuid, p_actor uuid, p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare previous public.site_generation_jobs;
begin
  -- One short global lock makes the global cost ceiling safe under concurrency.
  perform pg_advisory_xact_lock(481172);
  perform 1 from public.projects where id = p_project and owner_id = p_actor for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  select * into previous from public.site_generation_jobs where id = p_request;
  if found then
    if previous.project_id is distinct from p_project or previous.actor_id is distinct from p_actor then raise exception 'REQUEST_CONFLICT'; end if;
    if previous.state = 'running' and previous.expires_at < now() then
      update public.site_generation_jobs set state = 'failed' where id = p_request;
      previous.state := 'failed';
    end if;
    return to_jsonb(previous) || jsonb_build_object('claimed',false);
  end if;
  update public.site_generation_jobs set state = 'failed' where project_id = p_project and state = 'running' and expires_at < now();
  if exists (select 1 from public.site_generation_jobs where project_id = p_project and state = 'running') then raise exception 'GENERATION_BUSY'; end if;
  if (select count(*) from public.site_generation_jobs where actor_id = p_actor and created_at > now() - interval '24 hours') >= 8
    or (select count(*) from public.site_generation_jobs where created_at > now() - interval '24 hours') >= 150 then raise exception 'DAILY_LIMIT'; end if;
  insert into public.site_generation_jobs(id, project_id, actor_id) values(p_request, p_project, p_actor) returning * into previous;
  return to_jsonb(previous) || jsonb_build_object('claimed',true);
end $$;

create or replace function public.slate_append_version(p_project uuid, p_actor uuid, p_content jsonb, p_expected uuid, p_request uuid, p_proposal boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare latest uuid; saved public.site_versions; next_number integer; job public.site_generation_jobs;
begin
  perform 1 from public.projects where id = p_project and owner_id = p_actor for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  select * into saved from public.site_versions where project_id = p_project and request_id = p_request;
  if found then return to_jsonb(saved); end if;
  select * into job from public.site_generation_jobs where id = p_request for update;
  if found and (job.state <> 'running' or job.expires_at <= now() or job.project_id is distinct from p_project or job.actor_id is distinct from p_actor) then
    raise exception 'GENERATION_EXPIRED';
  end if;
  select id into latest from public.site_versions where project_id = p_project and visibility <> 'preview' order by version_number desc limit 1;
  if latest is distinct from p_expected then raise exception 'VERSION_CONFLICT'; end if;
  if not (p_content ? 'business') then raise exception 'MISSING_SNAPSHOT'; end if;
  select coalesce(max(version_number),0)+1 into next_number from public.site_versions where project_id = p_project;
  insert into public.site_versions(project_id, version_number, content, visibility, request_id)
    values(p_project, next_number, p_content, case when p_proposal then 'preview'::public.site_visibility else 'private'::public.site_visibility end, p_request)
    returning * into saved;
  insert into public.project_activity(project_id, actor_id, event_type, details)
    values(p_project, p_actor, case when p_proposal then 'revision_proposed' else 'site_draft_saved' end, jsonb_build_object('versionId',saved.id,'versionNumber',next_number));
  update public.site_generation_jobs set state='completed', phase='done', version_id=saved.id where id=p_request and state='running';
  return to_jsonb(saved);
end $$;

create or replace function public.slate_publish_version(p_project uuid, p_actor uuid, p_version uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.projects where id = p_project and owner_id = p_actor for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  if p_version is not null and not exists (select 1 from public.site_versions where id = p_version and project_id = p_project and visibility <> 'preview') then raise exception 'VERSION_NOT_FOUND'; end if;
  update public.site_versions set visibility = 'private', published_url = null where project_id = p_project and visibility = 'public';
  if p_version is not null then
    update public.site_versions set visibility = 'public', published_url = p_url where id = p_version;
  end if;
  update public.projects set status = case when p_version is null then 'preview_ready'::public.project_status else 'published'::public.project_status end where id = p_project;
  insert into public.project_activity(project_id, actor_id, event_type, details) values(p_project, p_actor,
    case when p_version is null then 'site_unpublished_by_owner' else 'site_published_by_owner' end, jsonb_build_object('versionId',p_version));
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('site-version-assets','site-version-assets',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
-- No browser policies: immutable copies are accessed only through scoped server routes.

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(), lead_activity_id uuid not null unique references public.project_activity(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade, recipient_email text not null, business_name text not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0, available_at timestamptz not null default now(),
  locked_until timestamptz, lock_token uuid, provider_message_id text, last_error text,
  created_at timestamptz not null default now()
);
alter table public.notification_outbox enable row level security;
create index if not exists notification_due on public.notification_outbox(available_at) where status in ('pending','sending');
create or replace function public.enqueue_lead_notification() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.event_type = 'public_contact_received' then
    insert into public.notification_outbox(lead_activity_id, project_id, recipient_email, business_name)
    select new.id, p.id, u.email, p.business_name from public.projects p join auth.users u on u.id = p.owner_id
    where p.id = new.project_id and u.email_confirmed_at is not null;
  end if;
  return new;
end $$;
drop trigger if exists enqueue_lead_notification on public.project_activity;
create trigger enqueue_lead_notification after insert on public.project_activity for each row execute function public.enqueue_lead_notification();

create or replace function public.slate_claim_notifications(p_project uuid default null)
returns setof public.notification_outbox language plpgsql security definer set search_path = public as $$
begin
  update public.notification_outbox set status='failed', last_error='Delivery window expired'
    where status in ('pending','sending') and (created_at < now() - interval '23 hours' or (attempts >= 5 and locked_until < now()));
  return query with due as (
    select id from public.notification_outbox where (p_project is null or project_id=p_project)
      and attempts < 5 and available_at <= now() and (status='pending' or (status='sending' and locked_until < now()))
    order by available_at for update skip locked limit 10
  ) update public.notification_outbox n set status='sending', attempts=attempts+1,
    locked_until=now()+interval '2 minutes', lock_token=gen_random_uuid() from due where n.id=due.id returning n.*;
end $$;

create table if not exists public.request_limits(key text primary key, hits integer not null, expires_at timestamptz not null);
alter table public.request_limits enable row level security;
create or replace function public.slate_take_limit(p_key text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare amount integer;
begin
  delete from public.request_limits where expires_at < now();
  insert into public.request_limits(key,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
    on conflict(key) do update set hits=request_limits.hits+1 returning hits into amount;
  return amount <= p_limit;
end $$;

revoke all on function public.slate_start_generation(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.slate_append_version(uuid,uuid,jsonb,uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.slate_publish_version(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.slate_claim_notifications(uuid) from public, anon, authenticated;
revoke all on function public.slate_take_limit(text,integer,integer) from public, anon, authenticated;
revoke all on function public.enqueue_lead_notification() from public, anon, authenticated;
grant execute on function public.slate_start_generation(uuid,uuid,uuid), public.slate_append_version(uuid,uuid,jsonb,uuid,uuid,boolean),
  public.slate_publish_version(uuid,uuid,uuid,text), public.slate_claim_notifications(uuid), public.slate_take_limit(text,integer,integer) to service_role;

create or replace function public.slate_save_brief(p_project uuid,p_actor uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare saved uuid; reference_id uuid;
begin
  insert into public.projects(id,owner_id,business_name,business_type,location,contact_email,contact_phone)
  values(p_project,p_actor,p_data->>'businessName',p_data->>'businessType',p_data->>'location',p_data->>'contactEmail',p_data->>'contactPhone')
  on conflict(id) do update set business_name=excluded.business_name,business_type=excluded.business_type,location=excluded.location,
    contact_email=excluded.contact_email,contact_phone=excluded.contact_phone where projects.owner_id=p_actor returning id into saved;
  if saved is null then raise exception 'NOT_OWNER'; end if;
  insert into public.project_briefs(project_id,business_story,primary_goal,website_copy,important_links,tone,color_preference,design_notes)
    values(saved,p_data->>'businessStory',p_data->>'primaryGoal',p_data->>'websiteCopy',p_data->>'importantLinks',p_data->>'tone',p_data->>'colors',p_data->>'designNotes')
  on conflict(project_id) do update set business_story=excluded.business_story,primary_goal=excluded.primary_goal,website_copy=excluded.website_copy,
    important_links=excluded.important_links,tone=excluded.tone,color_preference=excluded.color_preference,design_notes=excluded.design_notes;
  -- The current brief editor owns one reference; preserve any additional links.
  select id into reference_id from public.design_references where project_id=saved order by created_at,id limit 1;
  if coalesce(p_data->>'designUrl','')<>'' then
    if reference_id is null then
      insert into public.design_references(project_id,url,notes) values(saved,p_data->>'designUrl',p_data->>'designNotes');
    else
      update public.design_references set url=p_data->>'designUrl',notes=p_data->>'designNotes' where id=reference_id;
    end if;
  elsif reference_id is not null then
    delete from public.design_references where id=reference_id;
  end if;
  return saved;
end $$;
revoke all on function public.slate_save_brief(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.slate_save_brief(uuid,uuid,jsonb) to service_role;
commit;
