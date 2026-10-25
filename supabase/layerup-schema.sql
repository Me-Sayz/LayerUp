-- LayerUp: schema data per user. Dipakai hanya oleh server (service_role).

create schema if not exists layerup;

create table if not exists layerup.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  overlay_token text not null unique check (char_length(overlay_token) >= 32),
  worker_token text not null unique check (char_length(worker_token) >= 32),
  created_at timestamptz not null default now()
);

create table if not exists layerup.game_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null check (char_length(game_id) between 1 and 32),
  state jsonb,
  settings jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table layerup.profiles enable row level security;
alter table layerup.game_data enable row level security;

-- tanpa policy untuk anon/authenticated: browser tidak bisa menyentuh tabel ini
revoke all on schema layerup from anon, authenticated;
revoke all on all tables in schema layerup from anon, authenticated;

grant usage on schema layerup to service_role;
grant all on all tables in schema layerup to service_role;
alter default privileges in schema layerup grant all on tables to service_role;
