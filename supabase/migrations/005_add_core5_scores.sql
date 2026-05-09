-- Core 5 mechanic scores from MoveNet + compute_core_5 (backend)
ALTER TABLE public.swing_analyses
ADD COLUMN IF NOT EXISTS stance_score integer,
ADD COLUMN IF NOT EXISTS load_score integer,
ADD COLUMN IF NOT EXISTS power_position_score integer,
ADD COLUMN IF NOT EXISTS slot_score integer,
ADD COLUMN IF NOT EXISTS balance_at_contact_score integer,
ADD COLUMN IF NOT EXISTS core5_overall integer;
