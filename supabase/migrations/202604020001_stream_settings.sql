-- Current YouTube stream linkage for admin operations
create table if not exists stream_settings (
  id int primary key,
  current_video_id text not null default '',
  current_live_chat_id text not null default '',
  updated_at timestamptz not null default now(),
  constraint stream_settings_singleton check (id = 1)
);

insert into stream_settings (id, current_video_id, current_live_chat_id)
values (1, '', '')
on conflict (id) do nothing;
