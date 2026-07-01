-- Migration: Add loan_changes table for granular change tracking
-- Every single edit (even one letter/number) gets recorded here
-- Snapshots table already exists — we add updated_at for proper upsert

-- 1. Add updated_at column to snapshots so upserts overwrite correctly
ALTER TABLE public.snapshots
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Trigger to keep updated_at current on every upsert
CREATE OR REPLACE FUNCTION public.update_snapshot_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_updated_at ON public.snapshots;
CREATE TRIGGER trg_snapshot_updated_at
  BEFORE INSERT OR UPDATE ON public.snapshots
  FOR EACH ROW EXECUTE PROCEDURE public.update_snapshot_updated_at();

-- 2. loan_changes: one row per field change per loan edit
CREATE TABLE IF NOT EXISTS public.loan_changes (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id      UUID,                            -- NULL if loan was deleted
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  action       TEXT NOT NULL CHECK (action IN ('add','edit','delete','copy','complete')),
  person_name  TEXT NOT NULL,                   -- snapshot of the name at change time
  field_name   TEXT,                            -- which field changed (NULL for add/delete/complete)
  old_value    TEXT,                            -- previous value as text
  new_value    TEXT,                            -- new value as text
  note         TEXT                             -- optional human-readable description
);

CREATE INDEX loan_changes_user_id_idx  ON public.loan_changes(user_id);
CREATE INDEX loan_changes_changed_at_idx ON public.loan_changes(changed_at DESC);

GRANT SELECT, INSERT, DELETE ON public.loan_changes TO authenticated;
GRANT ALL ON public.loan_changes TO service_role;

ALTER TABLE public.loan_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own changes" ON public.loan_changes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
