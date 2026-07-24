-- Sleek AI Web Design Agent Schema Rollback Script
-- Reverts all custom tables, functions, triggers, and constraints created in schema.sql

-- Drop triggers
drop trigger if exists trg_pages_set_updated_at on public.pages;
drop trigger if exists trg_projects_set_updated_at on public.projects;
drop trigger if exists trg_messages_set_updated_at on public.messages;
drop trigger if exists trg_generation_runs_set_updated_at on public.generation_runs;
drop trigger if exists trg_generation_requests_set_updated_at on public.generation_requests;

-- Drop trigger functions and RPC routines
drop function if exists public.set_updated_at();
drop function if exists public.get_or_create_project(text, text, text);
drop function if exists public.begin_generation_request(text, uuid, uuid, text, text, text, text);
drop function if exists public.assert_project_owner(text, uuid);
drop function if exists public.finish_generation_request(text, uuid, text, jsonb, text);
drop function if exists public.touch_project(text, uuid);
drop function if exists public.sync_project_metadata(text, uuid, jsonb);
drop function if exists public.rebalance_page_positions(text, uuid);
drop function if exists public.update_page_positions(text, uuid, jsonb);
drop function if exists public.commit_message_pair(text, uuid, jsonb, jsonb);
drop function if exists public.commit_generation_result(text, uuid, jsonb, jsonb, jsonb);
drop function if exists public.commit_regeneration_result(text, uuid, uuid, text, text, jsonb, jsonb);

-- Drop tables (order respects foreign key dependencies)
drop table if exists public.generation_runs cascade;
drop table if exists public.generation_requests cascade;
drop table if exists public.messages cascade;
drop table if exists public.pages cascade;
drop table if exists public.projects cascade;
