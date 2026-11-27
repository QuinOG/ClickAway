-- A duel gets one race: racing_started_at marks when it began.
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS racing_started_at timestamptz NULL DEFAULT NULL;

-- A player's timed rounds can't overlap: the latest end a counted round could have had.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_round_ends_at timestamptz NULL DEFAULT NULL;
