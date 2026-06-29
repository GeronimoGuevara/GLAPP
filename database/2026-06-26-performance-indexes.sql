-- Indices no destructivos para mejorar consultas frecuentes.
-- Ejecutar una vez en Supabase SQL Editor.
-- No cambia datos existentes.

CREATE INDEX IF NOT EXISTS idx_couple_photos_couple_category_created
  ON couple_photos (couple_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_couple_photos_couple_created
  ON couple_photos (couple_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intimate_moments_couple_date
  ON intimate_moments (couple_id, moment_date DESC);

CREATE INDEX IF NOT EXISTS idx_menstrual_cycles_user_start
  ON menstrual_cycles (user_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_cycle_notes_note_date
  ON cycle_notes (note_date);

CREATE INDEX IF NOT EXISTS idx_cycle_notes_user_date
  ON cycle_notes (user_id, note_date);

CREATE INDEX IF NOT EXISTS idx_game_scores_couple_game_played
  ON game_scores (couple_id, game_name, played_at DESC);

CREATE INDEX IF NOT EXISTS idx_medication_logs_user_taken
  ON medication_logs (user_id, taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_ip
  ON api_rate_limits (ip);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_reset_time
  ON api_rate_limits (reset_time);

-- Indices utiles para vinculos de pareja y busquedas por codigo.
CREATE INDEX IF NOT EXISTS idx_users_couple_id
  ON users (couple_id);

CREATE INDEX IF NOT EXISTS idx_competitions_couple_a
  ON competitions (couple_a_id);

CREATE INDEX IF NOT EXISTS idx_competitions_couple_b
  ON competitions (couple_b_id);
