CREATE INDEX IF NOT EXISTS idx_user_loadouts_user
ON public.user_loadouts (user_id);

CREATE INDEX IF NOT EXISTS idx_challenges_replay
ON public.challenges (replay_id);
