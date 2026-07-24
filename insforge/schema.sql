-- Sleek AI Web Design Agent database schema
-- Tables required by app code:
--   projects, pages, messages

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null,
  "slugId" text not null unique,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  "projectId" uuid not null references public.projects(id) on delete cascade,
  name text not null,
  "rootStyles" text not null,
  "htmlContent" text not null,
  metadata jsonb not null default '{}'::jsonb,
  "position" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  "projectId" uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  parts jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null,
  "projectId" uuid not null references public.projects(id) on delete cascade,
  "selectedPageId" uuid null references public.pages(id) on delete set null,
  "idempotencyKey" text not null,
  "requestHash" text not null,
  "requestKind" text not null check ("requestKind" in ('chat', 'generate', 'regenerate')),
  status text not null check (status in ('in_progress', 'completed', 'failed', 'timed_out')),
  response jsonb null,
  error text null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("projectId", "idempotencyKey")
);

create table if not exists public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null,
  "projectId" uuid not null references public.projects(id) on delete cascade,
  "generationRequestId" uuid null references public.generation_requests(id) on delete set null,
  "selectedPageId" uuid null references public.pages(id) on delete set null,
  "requestKind" text not null check ("requestKind" in ('chat', 'generate', 'regenerate')),
  task text not null check (task in ('intent', 'preflight', 'chat', 'analysis', 'generate', 'regenerate')),
  status text not null check (status in ('completed', 'failed', 'timed_out', 'canceled')),
  model text not null,
  provider text null,
  attempt integer not null default 1,
  "latencyMs" integer null,
  "promptTokens" integer null,
  "completionTokens" integer null,
  "totalTokens" integer null,
  metadata jsonb not null default '{}'::jsonb,
  error text null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table public.generation_requests
  add column if not exists "ipHash" text;

alter table public.projects
  add column if not exists metadata jsonb;

alter table public.projects
  add column if not exists "updatedAt" timestamptz;

alter table public.pages
  add column if not exists "position" integer;

alter table public.pages
  add column if not exists metadata jsonb;

alter table public.messages
  add column if not exists "updatedAt" timestamptz;

alter table public.generation_runs
  add column if not exists provider text;

alter table public.generation_runs
  add column if not exists attempt integer;

alter table public.generation_runs
  add column if not exists "latencyMs" integer;

alter table public.generation_runs
  add column if not exists "promptTokens" integer;

alter table public.generation_runs
  add column if not exists "completionTokens" integer;

alter table public.generation_runs
  add column if not exists "totalTokens" integer;

alter table public.generation_runs
  add column if not exists metadata jsonb;

alter table public.generation_runs
  add column if not exists error text;

alter table public.generation_runs
  add column if not exists "updatedAt" timestamptz;

alter table public.generation_runs
  add column if not exists "generationRequestId" uuid;

alter table public.generation_runs
  add column if not exists "selectedPageId" uuid;

alter table public.projects
  alter column metadata set default '{}'::jsonb;

alter table public.pages
  alter column metadata set default '{}'::jsonb;

update public.projects
set metadata = '{}'::jsonb
where metadata is null;

update public.pages
set metadata = '{}'::jsonb
where metadata is null;

update public.generation_runs
set metadata = '{}'::jsonb
where metadata is null;

alter table public.projects
  alter column metadata set not null;

alter table public.pages
  alter column metadata set not null;

update public.projects
set "updatedAt" = coalesce("createdAt", now())
where "updatedAt" is null;

alter table public.projects
  alter column "updatedAt" set default now();

alter table public.projects
  alter column "updatedAt" set not null;

with ranked_pages as (
  select
    id,
    row_number() over (
      partition by "projectId"
      order by coalesce("position", 2147483647), "createdAt", id
    ) - 1 as next_position
  from public.pages
)
update public.pages
set "position" = ranked_pages.next_position
from ranked_pages
where public.pages.id = ranked_pages.id
  and public.pages."position" is distinct from ranked_pages.next_position;

alter table public.pages
  alter column "position" set default 0;

alter table public.pages
  alter column "position" set not null;

update public.messages
set "updatedAt" = coalesce("createdAt", now())
where "updatedAt" is null;

alter table public.messages
  alter column "updatedAt" set default now();

alter table public.messages
  alter column "updatedAt" set not null;

update public.generation_runs
set attempt = 1
where attempt is null;

alter table public.generation_runs
  alter column attempt set default 1;

alter table public.generation_runs
  alter column attempt set not null;

alter table public.generation_runs
  alter column metadata set default '{}'::jsonb;

alter table public.generation_runs
  alter column metadata set not null;

update public.generation_runs
set "updatedAt" = coalesce("createdAt", now())
where "updatedAt" is null;

alter table public.generation_runs
  alter column "updatedAt" set default now();

alter table public.generation_runs
  alter column "updatedAt" set not null;

create index if not exists projects_userid_createdat_idx
  on public.projects ("userId", "createdAt" desc);

create index if not exists pages_projectid_createdat_idx
  on public.pages ("projectId", "createdAt" asc);

create index if not exists pages_projectid_position_idx
  on public.pages ("projectId", "position" asc, "createdAt" asc);

create index if not exists messages_projectid_createdat_idx
  on public.messages ("projectId", "createdAt" asc);

create index if not exists generation_runs_projectid_createdat_idx
  on public.generation_runs ("projectId", "createdAt" desc);

create index if not exists generation_runs_requestid_createdat_idx
  on public.generation_runs ("generationRequestId", "createdAt" desc)
  where "generationRequestId" is not null;

create index if not exists generation_runs_selectedpageid_createdat_idx
  on public.generation_runs ("selectedPageId", "createdAt" desc)
  where "selectedPageId" is not null;

create index if not exists generation_runs_userid_createdat_idx
  on public.generation_runs ("userId", "createdAt" desc);

create index if not exists generation_requests_projectid_createdat_idx
  on public.generation_requests ("projectId", "createdAt" desc);

create index if not exists generation_requests_userid_createdat_idx
  on public.generation_requests ("userId", "createdAt" desc);

create index if not exists generation_requests_iphash_createdat_idx
  on public.generation_requests ("ipHash", "createdAt" desc)
  where "ipHash" is not null;

create index if not exists generation_requests_selectedpageid_createdat_idx
  on public.generation_requests ("selectedPageId", "createdAt" desc)
  where "selectedPageId" is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists trg_pages_set_updated_at on public.pages;
create trigger trg_pages_set_updated_at
before update on public.pages
for each row
execute function public.set_updated_at();

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

drop trigger if exists trg_messages_set_updated_at on public.messages;
create trigger trg_messages_set_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

drop trigger if exists trg_generation_runs_set_updated_at on public.generation_runs;
create trigger trg_generation_runs_set_updated_at
before update on public.generation_runs
for each row
execute function public.set_updated_at();

drop trigger if exists trg_generation_requests_set_updated_at on public.generation_requests;
create trigger trg_generation_requests_set_updated_at
before update on public.generation_requests
for each row
execute function public.set_updated_at();

create or replace function public.get_or_create_project(
  p_user_id text,
  p_slug_id text,
  p_title text
)
returns table (
  id uuid,
  "wasCreated" boolean,
  title text,
  "slugId" text
)
language plpgsql
as $$
declare
  v_project public.projects%rowtype;
  v_created boolean := false;
begin
  insert into public.projects ("userId", "slugId", title)
  values (p_user_id, p_slug_id, p_title)
  on conflict ("slugId") do nothing
  returning * into v_project;

  if v_project.id is not null then
    v_created := true;
  else
    select existing_project.*
    into v_project
    from public.projects as existing_project
    where existing_project."slugId" = p_slug_id;
  end if;

  if v_project."userId" <> p_user_id then
    raise exception 'PROJECT_OWNERSHIP_CONFLICT'
      using errcode = 'P0001';
  end if;

  return query
  select
    v_project.id as id,
    v_created as "wasCreated",
    v_project.title as title,
    v_project."slugId" as "slugId";
end;
$$;

drop function if exists public.begin_generation_request(text, uuid, uuid, text, text, text);
drop function if exists public.begin_generation_request(text, uuid, uuid, text, text, text, text);

create or replace function public.begin_generation_request(
  p_user_id text,
  p_project_id uuid,
  p_selected_page_id uuid,
  p_idempotency_key text,
  p_request_hash text,
  p_request_kind text,
  p_ip_hash text default null
)
returns table (
  id uuid,
  "wasCreated" boolean,
  status text,
  "requestHash" text,
  "requestKind" text,
  response jsonb,
  error text
)
language plpgsql
as $$
declare
  v_request public.generation_requests%rowtype;
  v_inserted boolean := false;
  v_user_window interval := interval '10 minutes';
  v_ip_window interval := interval '10 minutes';
  v_regenerate_cooldown interval := interval '20 seconds';
  v_user_limit integer := 12;
  v_ip_limit integer := 20;
  v_chat_user_limit integer := 30;
  v_chat_ip_limit integer := 60;
  v_recent_user_requests integer := 0;
  v_recent_ip_requests integer := 0;
begin
  if not exists (
    select 1
    from public.projects
    where id = p_project_id
      and "userId" = p_user_id
  ) then
    raise exception 'PROJECT_OWNERSHIP_CONFLICT'
      using errcode = 'P0001';
  end if;

  if p_selected_page_id is not null and not exists (
    select 1
    from public.pages
    where id = p_selected_page_id
      and "projectId" = p_project_id
  ) then
    raise exception 'PAGE_OWNERSHIP_CONFLICT'
      using errcode = 'P0001';
  end if;

  if p_request_kind in ('generate', 'regenerate', 'chat') then
    select count(*)
    into v_recent_user_requests
    from public.generation_requests
    where "userId" = p_user_id
      and "requestKind" = p_request_kind
      and "createdAt" >= now() - v_user_window;

    if v_recent_user_requests >= (case
      when p_request_kind = 'chat' then v_chat_user_limit
      else v_user_limit
    end) then
      raise exception 'USER_RATE_LIMIT_EXCEEDED'
        using errcode = 'P0001';
    end if;

    if p_ip_hash is not null then
      select count(*)
      into v_recent_ip_requests
      from public.generation_requests
      where "ipHash" = p_ip_hash
        and "requestKind" = p_request_kind
        and "createdAt" >= now() - v_ip_window;

      if v_recent_ip_requests >= (case
        when p_request_kind = 'chat' then v_chat_ip_limit
        else v_ip_limit
      end) then
        raise exception 'IP_RATE_LIMIT_EXCEEDED'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  if p_request_kind = 'regenerate' and p_selected_page_id is not null then
    if exists (
      select 1
      from public.generation_requests
      where "userId" = p_user_id
        and "selectedPageId" = p_selected_page_id
        and "requestKind" = 'regenerate'
        and "createdAt" >= now() - v_regenerate_cooldown
    ) then
      raise exception 'REGENERATE_COOLDOWN_ACTIVE'
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.generation_requests (
    "userId",
    "ipHash",
    "projectId",
    "selectedPageId",
    "idempotencyKey",
    "requestHash",
    "requestKind",
    status
  )
  values (
    p_user_id,
    p_ip_hash,
    p_project_id,
    p_selected_page_id,
    p_idempotency_key,
    p_request_hash,
    p_request_kind,
    'in_progress'
  )
  on conflict ("projectId", "idempotencyKey") do nothing
  returning * into v_request;

  if v_request.id is not null then
    v_inserted := true;
  else
    select *
    into v_request
    from public.generation_requests
    where "projectId" = p_project_id
      and "idempotencyKey" = p_idempotency_key;
  end if;

  if v_request."userId" <> p_user_id then
    raise exception 'GENERATION_REQUEST_OWNERSHIP_CONFLICT'
      using errcode = 'P0001';
  end if;

  if v_request."requestHash" <> p_request_hash then
    raise exception 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD'
      using errcode = 'P0001';
  end if;

  return query
  select
    v_request.id,
    v_inserted,
    v_request.status,
    v_request."requestHash",
    v_request."requestKind",
    v_request.response,
    v_request.error;
end;
$$;

create or replace function public.assert_project_owner(
  p_user_id text,
  p_project_id uuid
)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.projects
    where id = p_project_id
      and "userId" = p_user_id
  ) then
    raise exception 'PROJECT_OWNERSHIP_CONFLICT'
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.finish_generation_request(
  p_user_id text,
  p_request_id uuid,
  p_status text,
  p_response jsonb default null,
  p_error text default null
)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.generation_requests
    where id = p_request_id
      and "userId" = p_user_id
  ) then
    raise exception 'GENERATION_REQUEST_OWNERSHIP_CONFLICT'
      using errcode = 'P0001';
  end if;

  update public.generation_requests
  set
    status = p_status,
    response = p_response,
    error = p_error,
    "updatedAt" = now()
  where id = p_request_id;
end;
$$;

create or replace function public.touch_project(
  p_user_id text,
  p_project_id uuid
)
returns void
language plpgsql
as $$
begin
  perform public.assert_project_owner(p_user_id, p_project_id);

  update public.projects
  set "updatedAt" = now()
  where id = p_project_id;
end;
$$;

create or replace function public.sync_project_metadata(
  p_user_id text,
  p_project_id uuid,
  p_metadata jsonb
)
returns void
language plpgsql
as $$
begin
  perform public.assert_project_owner(p_user_id, p_project_id);

  update public.projects
  set
    metadata = coalesce(p_metadata, '{}'::jsonb),
    "updatedAt" = now()
  where id = p_project_id;
end;
$$;

create or replace function public.rebalance_page_positions(
  p_user_id text,
  p_project_id uuid
)
returns void
language plpgsql
as $$
begin
  perform public.assert_project_owner(p_user_id, p_project_id);

  with ranked_pages as (
    select
      id,
      row_number() over (
        order by "position" asc, "createdAt" asc, id asc
      ) - 1 as next_position
    from public.pages
    where "projectId" = p_project_id
  )
  update public.pages
  set "position" = ranked_pages.next_position
  from ranked_pages
  where public.pages.id = ranked_pages.id
    and public.pages."position" is distinct from ranked_pages.next_position;
end;
$$;

create or replace function public.update_page_positions(
  p_user_id text,
  p_project_id uuid,
  p_page_ids jsonb
)
returns void
language plpgsql
as $$
begin
  perform public.assert_project_owner(p_user_id, p_project_id);

  with desired_order as (
    select
      value::uuid as id,
      ordinality - 1 as next_position
    from jsonb_array_elements_text(coalesce(p_page_ids, '[]'::jsonb)) with ordinality
  )
  update public.pages
  set "position" = desired_order.next_position
  from desired_order
  where public.pages.id = desired_order.id
    and public.pages."projectId" = p_project_id;

  perform public.rebalance_page_positions(p_user_id, p_project_id);
  perform public.touch_project(p_user_id, p_project_id);
end;
$$;

create or replace function public.commit_message_pair(
  p_user_id text,
  p_project_id uuid,
  p_user_parts jsonb,
  p_assistant_parts jsonb
)
returns void
language plpgsql
as $$
begin
  perform public.assert_project_owner(p_user_id, p_project_id);

  insert into public.messages ("projectId", role, parts)
  values
    (p_project_id, 'user', coalesce(p_user_parts, '[]'::jsonb)),
    (p_project_id, 'assistant', coalesce(p_assistant_parts, '[]'::jsonb));

  perform public.touch_project(p_user_id, p_project_id);
end;
$$;

drop function if exists public.commit_generation_result(uuid, jsonb, jsonb, jsonb);
drop function if exists public.commit_generation_result(text, uuid, jsonb, jsonb, jsonb);

create or replace function public.commit_generation_result(
  p_user_id text,
  p_project_id uuid,
  p_user_parts jsonb,
  p_assistant_parts jsonb,
  p_pages jsonb
)
returns table (
  id uuid,
  name text,
  "rootStyles" text,
  "htmlContent" text,
  metadata jsonb,
  "position" integer,
  "createdAt" timestamptz,
  "updatedAt" timestamptz
)
language plpgsql
as $$
begin
  perform public.assert_project_owner(p_user_id, p_project_id);

  insert into public.messages ("projectId", role, parts)
  values
    (p_project_id, 'user', coalesce(p_user_parts, '[]'::jsonb)),
    (p_project_id, 'assistant', coalesce(p_assistant_parts, '[]'::jsonb));

  return query
  with page_payload as (
    select
      payload.name,
      payload."rootStyles",
      payload."htmlContent",
      row_number() over () - 1 as offset
    from jsonb_to_recordset(coalesce(p_pages, '[]'::jsonb)) as payload(
      name text,
      "rootStyles" text,
      "htmlContent" text,
      metadata jsonb
    )
  ),
  existing_pages as (
    select coalesce(max("position"), -1) as max_position
    from public.pages
    where "projectId" = p_project_id
  ),
  inserted_pages as (
    insert into public.pages ("projectId", name, "rootStyles", "htmlContent", metadata, "position")
    select
      p_project_id,
      page_payload.name,
      page_payload."rootStyles",
      page_payload."htmlContent",
      coalesce(page_payload.metadata, '{}'::jsonb),
      existing_pages.max_position + page_payload.offset + 1
    from page_payload
    cross join existing_pages
    returning
      public.pages.id,
      public.pages.name,
      public.pages."rootStyles",
      public.pages."htmlContent",
      public.pages.metadata,
      public.pages."position",
      public.pages."createdAt",
      public.pages."updatedAt"
  )
  select
    inserted_pages.id,
    inserted_pages.name,
    inserted_pages."rootStyles",
    inserted_pages."htmlContent",
    inserted_pages.metadata,
    inserted_pages."position",
    inserted_pages."createdAt",
    inserted_pages."updatedAt"
  from inserted_pages;

  perform public.touch_project(p_user_id, p_project_id);
end;
$$;

drop function if exists public.commit_regeneration_result(uuid, uuid, text, text, jsonb, jsonb);
drop function if exists public.commit_regeneration_result(text, uuid, uuid, text, text, jsonb, jsonb);

create or replace function public.commit_regeneration_result(
  p_user_id text,
  p_project_id uuid,
  p_page_id uuid,
  p_html_content text,
  p_root_styles text,
  p_user_parts jsonb,
  p_assistant_parts jsonb
)
returns table (
  id uuid,
  name text,
  "rootStyles" text,
  "htmlContent" text,
  metadata jsonb,
  "position" integer,
  "createdAt" timestamptz,
  "updatedAt" timestamptz
)
language plpgsql
as $$
begin
  perform public.assert_project_owner(p_user_id, p_project_id);

  insert into public.messages ("projectId", role, parts)
  values
    (p_project_id, 'user', coalesce(p_user_parts, '[]'::jsonb)),
    (p_project_id, 'assistant', coalesce(p_assistant_parts, '[]'::jsonb));

  return query
  update public.pages
  set
    "htmlContent" = p_html_content,
    "rootStyles" = p_root_styles
  where public.pages.id = p_page_id
    and public.pages."projectId" = p_project_id
  returning
    public.pages.id,
    public.pages.name,
    public.pages."rootStyles",
    public.pages."htmlContent",
    public.pages.metadata,
    public.pages."position",
    public.pages."createdAt",
    public.pages."updatedAt";

  perform public.touch_project(p_user_id, p_project_id);
end;
$$;

-- Defensive FK constraint check & NOT NULL enforcement to prevent orphan pages
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'pages_projectid_fkey'
      and table_name = 'pages'
  ) then
    alter table public.pages
      add constraint pages_projectid_fkey
      foreign key ("projectId")
      references public.projects(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'pages_position_nonnegative_chk'
      and table_name = 'pages'
  ) then
    alter table public.pages
      add constraint pages_position_nonnegative_chk
      check ("position" >= 0);
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'messages_role_chk'
      and table_name = 'messages'
  ) then
    alter table public.messages
      add constraint messages_role_chk
      check (role in ('user', 'assistant', 'system'));
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'generation_requests_requestkind_chk'
      and table_name = 'generation_requests'
  ) then
    alter table public.generation_requests
      add constraint generation_requests_requestkind_chk
      check ("requestKind" in ('chat', 'generate', 'regenerate'));
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'generation_requests_status_chk'
      and table_name = 'generation_requests'
  ) then
    alter table public.generation_requests
      add constraint generation_requests_status_chk
      check (status in ('in_progress', 'completed', 'failed', 'timed_out'));
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'generation_runs_task_chk'
      and table_name = 'generation_runs'
  ) then
    alter table public.generation_runs
      add constraint generation_runs_task_chk
      check (task in ('intent', 'preflight', 'chat', 'analysis', 'generate', 'regenerate'));
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'generation_runs_status_chk'
      and table_name = 'generation_runs'
  ) then
    alter table public.generation_runs
      add constraint generation_runs_status_chk
      check (status in ('completed', 'failed', 'timed_out', 'canceled'));
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'generation_runs_attempt_chk'
      and table_name = 'generation_runs'
  ) then
    alter table public.generation_runs
      add constraint generation_runs_attempt_chk
      check (attempt >= 1);
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'generation_runs_metrics_chk'
      and table_name = 'generation_runs'
  ) then
    alter table public.generation_runs
      add constraint generation_runs_metrics_chk
      check (
        ("latencyMs" is null or "latencyMs" >= 0) and
        ("promptTokens" is null or "promptTokens" >= 0) and
        ("completionTokens" is null or "completionTokens" >= 0) and
        ("totalTokens" is null or "totalTokens" >= 0)
      );
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'pages_htmlcontent_nonempty_chk'
      and table_name = 'pages'
  ) then
    alter table public.pages
      add constraint pages_htmlcontent_nonempty_chk
      check (length(trim("htmlContent")) > 0);
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'pages_name_nonempty_chk'
      and table_name = 'pages'
  ) then
    alter table public.pages
      add constraint pages_name_nonempty_chk
      check (length(trim(name)) > 0);
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'projects_title_nonempty_chk'
      and table_name = 'projects'
  ) then
    alter table public.projects
      add constraint projects_title_nonempty_chk
      check (length(trim(title)) > 0);
  end if;
end;
$$;


