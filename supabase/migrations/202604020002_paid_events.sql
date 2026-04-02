create table if not exists paid_events (
  id uuid primary key default gen_random_uuid(),
  message_id text not null unique,
  stream_video_id text not null,
  user_channel_id text not null,
  user_name text not null,
  message_text text not null default '',
  currency text not null,
  amount_micros bigint not null,
  amount_numeric numeric(18,6) not null,
  action_type text not null default '',
  action_target text not null default '',
  action_value text not null default '',
  created_at timestamptz not null
);

create index if not exists paid_events_stream_video_id_created_at_idx
  on paid_events (stream_video_id, created_at desc);

create index if not exists paid_events_stream_video_id_user_channel_id_idx
  on paid_events (stream_video_id, user_channel_id);
