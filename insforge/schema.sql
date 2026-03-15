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

create index if not exists projects_userid_createdat_idx
  on public.projects ("userId", "createdAt" desc);

create index if not exists pages_projectid_createdat_idx
  on public.pages ("projectId", "createdAt" asc);

create index if not exists messages_projectid_createdat_idx
  on public.messages ("projectId", "createdAt" asc);

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
