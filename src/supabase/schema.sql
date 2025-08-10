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
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  amount numeric not null default 0,
  created_at timestamptz default now(),
  unique (session_id, user_id)
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
to authenticated
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

-- ---- participants policies ----
drop policy if exists participants_select_session_members on public.participants;
create policy participants_select_session_members
on public.participants
for select
to authenticated
using (
  exists (
    select 1 from public.participants me
    where me.session_id = participants.session_id and me.user_id = auth.uid()
  )
  OR exists (
    select 1 from public.sessions s
    where s.id = participants.session_id and s.created_by = auth.uid()
  )
);

drop policy if exists participants_insert_self on public.participants;
create policy participants_insert_self
on public.participants
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists participants_update_self on public.participants;
create policy participants_update_self
on public.participants
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ---- bids policies ----
drop policy if exists bids_select_session_members on public.bids;
create policy bids_select_session_members
on public.bids
for select
to authenticated
using (
  exists (
    select 1 from public.participants me
    where me.session_id = bids.session_id and me.user_id = auth.uid()
  )
  OR exists (
    select 1 from public.sessions s
    where s.id = bids.session_id and s.created_by = auth.uid()
  )
);

drop policy if exists bids_insert_owner_only on public.bids;
create policy bids_insert_owner_only
on public.bids
for insert
to authenticated
with check (
  exists (
    select 1 from public.participants p
    where p.id = bids.participant_id
      and p.user_id = auth.uid()
  )
);

-- ============ RPC ============
create or replace function public.place_bid(p_session uuid, p_delta numeric)
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

  update public.participants
     set amount = amount + p_delta
   where session_id = p_session
     and user_id = auth.uid()
  returning * into me;

  if me.id is null then
    raise exception 'No participant row for this user in session';
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
