-- NULL preserves the legacy History label for existing rows.
ALTER TABLE public.round_history
  ADD COLUMN IF NOT EXISTS rank_result_kind varchar(10) DEFAULT NULL
  CHECK (rank_result_kind IN ('rr', 'placement'));
