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

-- 24h stream schedule extension
create table if not exists stream_schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  theme text,
  stream_date date,
  start_at timestamptz not null,
  end_at timestamptz not null,
  auto_narration_enabled boolean not null default true,
  ai_reply_enabled boolean not null default true,
  voice_reply_enabled boolean not null default true,
  auto_post_x_enabled boolean not null default false,
  auto_post_threads_enabled boolean not null default false,
  reply_mode text not null default 'broad' check (reply_mode in ('broad','normal','strict')),
  reply_frequency_limit_per_minute int not null default 8,
  same_user_cooldown_ms int not null default 120000,
  min_comment_length int not null default 5,
  max_comment_length int not null default 120,
  voice_speed numeric(4,2) not null default 1.00,
  voice_volume numeric(4,2) not null default 0.85,
  voice_max_seconds int not null default 8,
  voice_summarize_long_text boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stream_periods (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references stream_schedules(id) on delete cascade,
  sort_order int not null,
  name text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  bonus_type text not null,
  bonus_value numeric(4,2) not null default 1.00,
  ai_comment_mode text not null default 'broad' check (ai_comment_mode in ('broad','normal','strict')),
  voice_enabled boolean not null default true,
  narration_level int not null default 2,
  overlay_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists paid_comments (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references stream_schedules(id) on delete cascade,
  platform text not null,
  user_id text not null,
  user_name text not null,
  amount numeric(12,2) not null,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists ai_reply_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references stream_schedules(id) on delete cascade,
  source_comment_id text,
  user_id text,
  user_name text,
  original_text text not null,
  picked boolean not null,
  priority int not null default 0,
  reply_text text,
  reply_mode text check (reply_mode in ('broad','normal','strict')),
  reply_category text,
  spoken boolean not null default false,
  created_at timestamptz not null default now()
);
