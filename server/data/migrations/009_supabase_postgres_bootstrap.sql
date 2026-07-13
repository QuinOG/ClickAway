create table if not exists public.achievements_catalog (
  id varchar(60) primary key
);

create table if not exists public.arena_themes (
  id bigint primary key
);

create table if not exists public.button_skins (
  id bigint primary key
);

create table if not exists public.profile_images (
  id bigint primary key
);

create table if not exists public.users (
  id bigint generated always as identity primary key,
  username varchar(50) not null unique,
  password_hash varchar(255) not null,
  coins bigint not null default 0,
  xp integer not null default 0,
  mmr integer not null default 0,
  current_button_skin_id bigint,
  current_arena_theme_id bigint,
  current_profile_theme_id bigint,
  role varchar(20) not null default 'player',
  rank_system_version integer not null default 0,
  placement_matches_played integer not null default 0,
  demotion_protection_rounds integer not null default 0,
  active_loadout_slot varchar(60),
  build_walkthrough_status varchar(60) not null default 'not_started',
  seen_unlock_part_ids_json jsonb
);
create index if not exists idx_users_mmr_id on public.users (mmr, id);

create table if not exists public.round_history (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users (id) on delete cascade,
  mode varchar(50) not null default 'normal',
  progression_mode varchar(50) not null default 'non_ranked',
  score integer not null default 0,
  hits integer not null default 0,
  misses integer not null default 0,
  best_streak integer not null default 0,
  coins_earned integer not null default 0,
  xp_earned integer not null default 0,
  rank_delta integer not null default 0,
  avg_reaction_ms integer,
  best_reaction_ms integer,
  loadout_name varchar(100),
  loadout_id varchar(60),
  tempo_core_id varchar(60),
  streak_lens_id varchar(60),
  power_rig_id varchar(60),
  powerup_slot_1_id varchar(60),
  powerup_slot_2_id varchar(60),
  powerup_slot_3_id varchar(60),
  played_at timestamptz not null default now()
);
create index if not exists idx_user_played on public.round_history (user_id, played_at);
create index if not exists idx_round_history_progression_user on public.round_history (progression_mode, user_id);

create table if not exists public.user_achievement_progress (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users (id) on delete cascade,
  achievement_id varchar(60) not null,
  unlocked_at timestamptz,
  unique (user_id, achievement_id)
);
create index if not exists idx_user_unlocked on public.user_achievement_progress (user_id, unlocked_at);
create index if not exists idx_achprog_catalog on public.user_achievement_progress (achievement_id);

create table if not exists public.user_collection (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users (id) on delete cascade,
  item_type varchar(50) not null,
  item_id bigint not null,
  unique (user_id, item_type, item_id)
);

create table if not exists public.user_lifetime_stats (
  user_id bigint primary key references public.users (id) on delete cascade,
  total_rounds integer not null default 0,
  ranked_rounds integer not null default 0,
  best_streak integer not null default 0,
  best_single_score integer not null default 0,
  best_ranked_streak integer not null default 0,
  best_single_round_accuracy integer not null default 0,
  clean_rounds integer not null default 0,
  total_coins_earned bigint not null default 0,
  total_hits bigint not null default 0,
  total_misses bigint not null default 0,
  max_consecutive_ranked_wins integer not null default 0,
  current_consecutive_ranked_wins integer not null default 0,
  reaction_rounds integer not null default 0,
  total_reaction_ms bigint not null default 0,
  best_reaction_ms integer,
  drill_stats_json jsonb
);

create table if not exists public.user_loadout_stats (
  user_id bigint not null references public.users (id) on delete cascade,
  loadout_id varchar(60) not null,
  loadout_name varchar(100) not null default 'Loadout',
  total_rounds integer not null default 0,
  ranked_rounds integer not null default 0,
  ranked_wins integer not null default 0,
  best_score integer not null default 0,
  best_streak integer not null default 0,
  best_ranked_streak integer not null default 0,
  total_hits bigint not null default 0,
  total_misses bigint not null default 0,
  primary key (user_id, loadout_id)
);
create index if not exists idx_loadout_stats_user_rounds on public.user_loadout_stats (user_id, total_rounds);

create table if not exists public.user_loadouts (
  slot_id varchar(60) not null,
  user_id bigint not null references public.users (id) on delete cascade,
  name varchar(100) not null default '',
  tempo_core_id varchar(60),
  streak_lens_id varchar(60),
  power_rig_id varchar(60),
  powerup_slot_1_id varchar(60),
  powerup_slot_2_id varchar(60),
  powerup_slot_3_id varchar(60),
  primary key (slot_id, user_id)
);
create index if not exists idx_user_loadouts_user on public.user_loadouts (user_id);

create table if not exists public.seasons (
  id bigint generated always as identity primary key,
  slug varchar(60) not null unique,
  name varchar(100) not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status varchar(20) not null default 'active'
);
create index if not exists idx_season_status_dates on public.seasons (status, starts_at, ends_at);

create table if not exists public.user_season_stats (
  user_id bigint not null references public.users (id) on delete cascade,
  season_id bigint not null references public.seasons (id) on delete cascade,
  ranked_rounds integer not null default 0,
  peak_mmr integer not null default 0,
  reward_tier integer not null default 0,
  primary key (user_id, season_id)
);
create index if not exists idx_user_season_peak_mmr on public.user_season_stats (season_id, peak_mmr);

create table if not exists public.round_replays (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users (id) on delete cascade,
  username varchar(50) not null,
  mode_id varchar(50) not null,
  seed bigint not null,
  events_json jsonb not null,
  loadout_snapshot_json jsonb,
  score integer not null default 0,
  hits integer not null default 0,
  misses integer not null default 0,
  best_streak integer not null default 0,
  visibility varchar(20) not null default 'public',
  round_history_id bigint,
  played_at timestamptz not null default now()
);
create index if not exists idx_replays_user_played on public.round_replays (user_id, played_at);
create index if not exists idx_replays_visibility_score on public.round_replays (visibility, score);

create table if not exists public.challenges (
  id bigint generated always as identity primary key,
  challenger_user_id bigint not null references public.users (id) on delete cascade,
  challenger_username varchar(50) not null,
  opponent_user_id bigint not null references public.users (id) on delete cascade,
  opponent_username varchar(50) not null,
  replay_id bigint not null references public.round_replays (id) on delete cascade,
  mode_id varchar(50) not null,
  status varchar(20) not null default 'pending',
  message varchar(280),
  opponent_replay_id bigint,
  challenger_won boolean,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz
);
create index if not exists idx_challenges_opponent_status on public.challenges (opponent_user_id, status, created_at);
create index if not exists idx_challenges_challenger_status on public.challenges (challenger_user_id, status, created_at);
create index if not exists idx_challenges_replay on public.challenges (replay_id);

insert into public.arena_themes (id)
values (1), (2), (3), (4)
on conflict (id) do nothing;

insert into public.button_skins (id)
values (1), (2), (3), (4), (5), (6), (7), (8), (9), (10), (11), (12), (13), (14), (15), (16)
on conflict (id) do nothing;

insert into public.profile_images (id)
values (1), (2), (3), (4), (5), (6), (7)
on conflict (id) do nothing;

insert into public.achievements_catalog (id)
values
  ('easy-rounds-1'),
  ('easy-rounds-10'),
  ('hard-rounds-50'),
  ('career-rounds-100'),
  ('career-rounds-250'),
  ('easy-level-5'),
  ('hard-level-15'),
  ('career-level-50'),
  ('career-level-100'),
  ('career-level-250'),
  ('easy-ranked-1'),
  ('hard-ranked-10'),
  ('hard-ranked-50'),
  ('career-ranked-100'),
  ('career-ranked-250'),
  ('easy-coins-500'),
  ('hard-coins-2000'),
  ('hard-coins-5000'),
  ('career-coins-25000'),
  ('career-coins-50000'),
  ('easy-streak-20'),
  ('hard-streak-30'),
  ('hard-streak-40'),
  ('career-streak-45'),
  ('career-streak-50'),
  ('skill-clean-1'),
  ('skill-clean-10'),
  ('skill-clean-25'),
  ('skill-accuracy-90'),
  ('skill-accuracy-95'),
  ('skill-ranked-streak-15'),
  ('skill-ranked-streak-25'),
  ('skill-consec-wins-3'),
  ('skill-consec-wins-5'),
  ('skill-score-100'),
  ('skill-score-200'),
  ('master-rounds'),
  ('master-level'),
  ('master-ranked'),
  ('master-economy'),
  ('master-streak'),
  ('master-skill'),
  ('master-of-masters')
on conflict (id) do nothing;

insert into public.seasons (slug, name, starts_at, ends_at, status)
select 'season-1', 'Season 1', now(), now() + interval '90 days', 'active'
where not exists (
  select 1 from public.seasons where status = 'active'
)
on conflict (slug) do nothing;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
