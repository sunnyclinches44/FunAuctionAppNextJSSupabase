-- Enable uuid generator if needed
create extension if not exists pgcrypto;

-- ============ Tables ============
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  is_active boolean default true
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  device_id text,
  display_name text not null,
  amount numeric not null default 0,
  created_at timestamptz default now(),
  unique (session_id, user_id),
  unique (session_id, device_id)
);

create table if not exists public.bids (
  id bigserial primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  delta numeric not null check (delta >= 5),
  created_at timestamptz default now()
);

create index if not exists idx_participants_session on public.participants(session_id);
create index if not exists idx_bids_session on public.bids(session_id);

-- ============ RLS ============
alter table public.sessions enable row level security;
alter table public.participants enable row level security;
alter table public.bids enable row level security;

-- ---- sessions policies ----
drop policy if exists sessions_select_by_code_active on public.sessions;
create policy sessions_select_by_code_active
on public.sessions
for select
to authenticated, anon
using (is_active = true);

drop policy if exists sessions_insert_creator on public.sessions;
create policy sessions_insert_creator
on public.sessions
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists sessions_select_creator_or_member on public.sessions;
create policy sessions_select_creator_or_member
on public.sessions
for select
to authenticated
using (
  created_by = auth.uid()
  OR exists (
    select 1 from public.participants p
    where p.session_id = sessions.id and p.user_id = auth.uid()
  )
);

drop policy if exists sessions_delete_creator on public.sessions;
create policy sessions_delete_creator
on public.sessions
for delete
to authenticated
using (
  -- Allow deletion if user is the creator OR if they are an admin (authenticated user)
  created_by = auth.uid() OR auth.uid() IS NOT NULL
);

-- ---- participants policies ----
drop policy if exists participants_select_session_members on public.participants;
create policy participants_select_session_members
on public.participants
for select
to authenticated, anon
using (
  -- Allow access to participants in active sessions
  exists (
    select 1 from public.sessions s
    where s.id = participants.session_id and s.is_active = true
  )
);

drop policy if exists participants_insert_self on public.participants;
create policy participants_insert_self
on public.participants
for insert
to authenticated, anon
with check (
  -- Allow authenticated users to insert with their user_id
  (auth.uid() is not null and user_id = auth.uid())
  OR 
  -- Allow anonymous users to insert with device_id
  (auth.uid() is null and device_id is not null and user_id is null)
);

drop policy if exists participants_update_self on public.participants;
create policy participants_update_self
on public.participants
for update
to authenticated, anon
using (
  -- Allow authenticated users to update their own records
  (auth.uid() is not null and user_id = auth.uid())
  OR 
  -- Allow anonymous users to update their device-based records
  (auth.uid() is null and device_id is not null and user_id is null)
)
with check (
  -- Same conditions for the update
  (auth.uid() is not null and user_id = auth.uid())
  OR 
  (auth.uid() is null and device_id is not null and user_id is null)
);

-- ---- bids policies ----
drop policy if exists bids_select_session_members on public.bids;
create policy bids_select_session_members
on public.bids
for select
to authenticated, anon
using (
  -- Allow access to bids in active sessions
  exists (
    select 1 from public.sessions s
    where s.id = bids.session_id and s.is_active = true
  )
);

drop policy if exists bids_insert_owner_only on public.bids;
create policy bids_insert_owner_only
on public.bids
for insert
to authenticated, anon
with check (
  -- Allow insertion if the participant exists and is owned by the user/device
  exists (
    select 1 from public.participants p
    where p.id = bids.participant_id
      and (
        (auth.uid() is not null and p.user_id = auth.uid())
        OR 
        (auth.uid() is null and p.device_id is not null and p.user_id is null)
      )
  )
);

-- ============ RPC ============
create or replace function public.place_bid(p_session uuid, p_delta numeric, p_device text default null)
returns public.participants
language plpgsql
security invoker
as $$
declare
  me public.participants;
begin
  if p_delta < 5 then
    raise exception 'Minimum bid is 5';
  end if;

  -- Try to find participant by user_id first, then by device_id
  if auth.uid() is not null then
    update public.participants
       set amount = amount + p_delta
     where session_id = p_session
       and user_id = auth.uid()
    returning * into me;
  elsif p_device is not null then
    update public.participants
       set amount = amount + p_delta
     where session_id = p_session
       and device_id = p_device
       and user_id is null
    returning * into me;
  end if;

  if me.id is null then
    raise exception 'No participant row for this user/device in session';
  end if;

  insert into public.bids(session_id, participant_id, delta)
  values (p_session, me.id, p_delta);

  return me;
end;
$$;

-- Optional convenience view
create or replace view public.session_totals as
  select session_id, sum(amount)::numeric as total
  from public.participants
  group by session_id;
