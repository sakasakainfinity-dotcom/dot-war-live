-- Match-specific overlay settings for OBS browser source URLs.
create table if not exists live_matches (
  match_id text primary key,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_matches_updated_at_idx on live_matches (updated_at desc);
