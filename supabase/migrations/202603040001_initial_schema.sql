-- Dot War Live: initial schema
create extension if not exists pgcrypto;

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  title_ja text not null,
  title_en text not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists game_states (
  match_id uuid primary key references matches(id) on delete cascade,
  turn_index int not null default 0,
  phase text not null default 'debate' check (phase in ('debate','action')),
  phase_ends_at timestamptz not null,
  board jsonb not null,
  bombs_a int not null default 0,
  bombs_b int not null default 0,
  center_bonus_claimed_by text check (center_bonus_claimed_by in ('A','B')),
  updated_at timestamptz not null default now()
);

create table if not exists chat_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  platform text not null check (platform in ('youtube','twitch')),
  message_id text not null,
  user_id text not null,
  user_name text not null,
  text text not null,
  paid_tier int not null default 0 check (paid_tier in (0,100,300,500)),
  received_at timestamptz not null default now(),
  unique (platform, message_id)
);

create table if not exists actions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  turn_index int not null,
  user_id text not null,
  team text not null check (team in ('A','B')),
  action text not null check (action in ('place','attack','shield','bomb')),
  cell_id int not null check (cell_id between 0 and 199),
  accepted boolean not null,
  reason text,
  paid_tier int not null default 0 check (paid_tier in (0,100,300,500)),
  created_at timestamptz not null default now(),
  unique (match_id, turn_index, user_id)
);

create table if not exists support_points (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  team text not null check (team in ('A','B')),
  user_id text not null,
  user_name text not null,
  points int not null,
  source_platform text not null check (source_platform in ('youtube','twitch')),
  created_at timestamptz not null default now()
);

create view if not exists leaderboard as
select
  match_id,
  team,
  user_id,
  max(user_name) as user_name,
  sum(points) as total_points,
  dense_rank() over (partition by match_id, team order by sum(points) desc) as rank
from support_points
group by match_id, team, user_id;
