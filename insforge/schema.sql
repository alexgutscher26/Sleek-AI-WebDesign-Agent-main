-- Sleek AI Web Design Agent database schema
-- Tables required by app code:
--   projects, pages, messages

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null,
  "slugId" text not null unique,
  title text not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  "projectId" uuid not null references public.projects(id) on delete cascade,
  name text not null,
  "rootStyles" text not null,
  "htmlContent" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  "projectId" uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  parts jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now()
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

alter table public.generation_requests
  add column if not exists "ipHash" text;

create index if not exists projects_userid_createdat_idx
  on public.projects ("userId", "createdAt" desc);

create index if not exists pages_projectid_createdat_idx
  on public.pages ("projectId", "createdAt" asc);

create index if not exists messages_projectid_createdat_idx
  on public.messages ("projectId", "createdAt" asc);

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
    select *
    into v_project
    from public.projects
    where "slugId" = p_slug_id;
  end if;

  if v_project."userId" <> p_user_id then
    raise exception 'PROJECT_OWNERSHIP_CONFLICT'
      using errcode = 'P0001';
  end if;

  return query
  select v_project.id, v_created, v_project.title, v_project."slugId";
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
  v_recent_user_requests integer := 0;
  v_recent_ip_requests integer := 0;
begin
  if p_request_kind in ('generate', 'regenerate') then
    select count(*)
    into v_recent_user_requests
    from public.generation_requests
    where "userId" = p_user_id
      and "createdAt" >= now() - v_user_window;

    if v_recent_user_requests >= v_user_limit then
      raise exception 'USER_RATE_LIMIT_EXCEEDED'
        using errcode = 'P0001';
    end if;

    if p_ip_hash is not null then
      select count(*)
      into v_recent_ip_requests
      from public.generation_requests
      where "ipHash" = p_ip_hash
        and "createdAt" >= now() - v_ip_window;

      if v_recent_ip_requests >= v_ip_limit then
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

create or replace function public.finish_generation_request(
  p_request_id uuid,
  p_status text,
  p_response jsonb default null,
  p_error text default null
)
returns void
language plpgsql
as $$
begin
  update public.generation_requests
  set
    status = p_status,
    response = p_response,
    error = p_error,
    "updatedAt" = now()
  where id = p_request_id;
end;
$$;

create or replace function public.commit_message_pair(
  p_project_id uuid,
  p_user_parts jsonb,
  p_assistant_parts jsonb
)
returns void
language plpgsql
as $$
begin
  insert into public.messages ("projectId", role, parts)
  values
    (p_project_id, 'user', coalesce(p_user_parts, '[]'::jsonb)),
    (p_project_id, 'assistant', coalesce(p_assistant_parts, '[]'::jsonb));
end;
$$;

create or replace function public.commit_generation_result(
  p_project_id uuid,
  p_user_parts jsonb,
  p_assistant_parts jsonb,
  p_pages jsonb
)
returns table (
  id uuid,
  name text,
  "rootStyles" text,
  "htmlContent" text
)
language plpgsql
as $$
begin
  insert into public.messages ("projectId", role, parts)
  values
    (p_project_id, 'user', coalesce(p_user_parts, '[]'::jsonb)),
    (p_project_id, 'assistant', coalesce(p_assistant_parts, '[]'::jsonb));

  return query
  with inserted_pages as (
    insert into public.pages ("projectId", name, "rootStyles", "htmlContent")
    select
      p_project_id,
      payload.name,
      payload."rootStyles",
      payload."htmlContent"
    from jsonb_to_recordset(coalesce(p_pages, '[]'::jsonb)) as payload(
      name text,
      "rootStyles" text,
      "htmlContent" text
    )
    returning public.pages.id, public.pages.name, public.pages."rootStyles", public.pages."htmlContent"
  )
  select inserted_pages.id, inserted_pages.name, inserted_pages."rootStyles", inserted_pages."htmlContent"
  from inserted_pages;
end;
$$;

create or replace function public.commit_regeneration_result(
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
  "htmlContent" text
)
language plpgsql
as $$
begin
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
  returning public.pages.id, public.pages.name, public.pages."rootStyles", public.pages."htmlContent";
end;
$$;
