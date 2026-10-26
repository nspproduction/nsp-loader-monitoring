-- Loader Monitoring — initial schema
-- Run in Supabase SQL Editor (or via CLI) against the target project.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================================
-- OPERATORS (profile table linked to Supabase auth.users)
-- =========================================================================
create table if not exists public.operators (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- QR TOKENS (short-lived, single-use)
-- =========================================================================
create table if not exists public.qr_tokens (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,
  issued_by uuid references public.operators(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_queue_id uuid
);

create index if not exists qr_tokens_token_idx on public.qr_tokens(token);
create index if not exists qr_tokens_valid_idx on public.qr_tokens(expires_at)
  where used_at is null;

-- =========================================================================
-- QUEUE ENTRIES (one row per truck trip)
-- =========================================================================
do $$ begin
  create type queue_status as enum ('waiting', 'loading', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.queues (
  id uuid primary key default uuid_generate_v4(),
  public_slug text not null unique default encode(gen_random_bytes(8), 'hex'),
  customer_name text not null,
  license_plate text not null,
  driver_name text not null,
  arrived_at timestamptz not null default now(),
  started_loading_at timestamptz,
  finished_loading_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  status queue_status not null default 'waiting',
  priority bigint not null default (extract(epoch from now()) * 1000)::bigint,
  started_by uuid references public.operators(id),
  finished_by uuid references public.operators(id),
  cancelled_by uuid references public.operators(id),
  token_id uuid references public.qr_tokens(id)
);

create index if not exists queues_status_priority_idx on public.queues(status, priority);
create index if not exists queues_arrived_at_idx on public.queues(arrived_at desc);
create index if not exists queues_slug_idx on public.queues(public_slug);

alter table public.qr_tokens
  drop constraint if exists qr_tokens_queue_fk,
  add constraint qr_tokens_queue_fk
    foreign key (used_by_queue_id) references public.queues(id) on delete set null;

-- =========================================================================
-- RPC: consume_token_and_create_queue
-- Called by anon (driver) after scanning QR + filling form.
-- Atomically validates token, consumes it, creates queue entry.
-- Returns the public_slug for the driver status page.
-- =========================================================================
create or replace function public.consume_token_and_create_queue(
  p_token text,
  p_customer_name text,
  p_license_plate text,
  p_driver_name text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
  v_queue_id uuid;
  v_slug text;
begin
  if length(trim(p_customer_name)) = 0
     or length(trim(p_license_plate)) = 0
     or length(trim(p_driver_name)) = 0 then
    raise exception 'FIELDS_REQUIRED';
  end if;

  select id into v_token_id
  from public.qr_tokens
  where token = p_token
    and used_at is null
    and expires_at > now()
  for update;

  if v_token_id is null then
    raise exception 'TOKEN_INVALID';
  end if;

  insert into public.queues (customer_name, license_plate, driver_name, token_id)
  values (
    trim(p_customer_name),
    upper(trim(p_license_plate)),
    trim(p_driver_name),
    v_token_id
  )
  returning id, public_slug into v_queue_id, v_slug;

  update public.qr_tokens
    set used_at = now(), used_by_queue_id = v_queue_id
    where id = v_token_id;

  return v_slug;
end;
$$;

grant execute on function public.consume_token_and_create_queue(text, text, text, text) to anon, authenticated;

-- =========================================================================
-- RPC: validate_token (read-only check for /arrive page load)
-- =========================================================================
create or replace function public.validate_token(p_token text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.qr_tokens
    where token = p_token
      and used_at is null
      and expires_at > now()
  );
$$;

grant execute on function public.validate_token(text) to anon, authenticated;

-- =========================================================================
-- RPC: swap_queue_priority (operator moves a row up/down)
-- Swaps priority with the adjacent waiting row in given direction.
-- =========================================================================
create or replace function public.swap_queue_priority(
  p_queue_id uuid,
  p_direction text  -- 'up' or 'down'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_priority bigint;
  v_neighbor_id uuid;
  v_neighbor_priority bigint;
begin
  select priority into v_current_priority
  from public.queues
  where id = p_queue_id and status = 'waiting'
  for update;

  if v_current_priority is null then
    raise exception 'QUEUE_NOT_WAITING';
  end if;

  if p_direction = 'up' then
    select id, priority into v_neighbor_id, v_neighbor_priority
    from public.queues
    where status = 'waiting' and priority < v_current_priority
    order by priority desc
    limit 1
    for update;
  elsif p_direction = 'down' then
    select id, priority into v_neighbor_id, v_neighbor_priority
    from public.queues
    where status = 'waiting' and priority > v_current_priority
    order by priority asc
    limit 1
    for update;
  else
    raise exception 'INVALID_DIRECTION';
  end if;

  if v_neighbor_id is null then
    return; -- already at edge
  end if;

  update public.queues set priority = v_neighbor_priority where id = p_queue_id;
  update public.queues set priority = v_current_priority where id = v_neighbor_id;
end;
$$;

revoke execute on function public.swap_queue_priority(uuid, text) from anon;
grant execute on function public.swap_queue_priority(uuid, text) to authenticated;

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.operators enable row level security;
alter table public.qr_tokens enable row level security;
alter table public.queues    enable row level security;

-- Operators: authenticated users can read all operator profiles (for display)
drop policy if exists operators_select on public.operators;
create policy operators_select on public.operators
  for select to authenticated using (true);

-- qr_tokens: only authenticated operators manage directly;
--   anon flow goes through SECURITY DEFINER functions above.
drop policy if exists qr_tokens_auth_all on public.qr_tokens;
create policy qr_tokens_auth_all on public.qr_tokens
  for all to authenticated using (true) with check (true);

-- queues: authenticated operators = full access.
-- Anon can SELECT all queues (needed for driver status page: own position + currently-loading list).
-- Driver names visible to drivers is acceptable here (they're physically in the same yard).
drop policy if exists queues_auth_all on public.queues;
create policy queues_auth_all on public.queues
  for all to authenticated using (true) with check (true);

drop policy if exists queues_anon_select on public.queues;
create policy queues_anon_select on public.queues
  for select to anon using (true);

-- =========================================================================
-- REALTIME publication
-- =========================================================================
do $$ begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    alter publication supabase_realtime add table public.queues;
  end if;
exception when duplicate_object then null;
end $$;
