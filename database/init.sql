-- Script SQL para inicializar la base de datos de Nuestros Momentos
-- Ejecuta este script en el SQL Editor de Neon si prefieres crear las tablas manualmente

-- Tabla de usuarios (solo ustedes dos)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  pin VARCHAR(4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar usuarios iniciales (opcional - puedes hacerlo desde la app)
INSERT INTO users (name, pin) VALUES
  ('Usuario 1', '1234'),
  ('Usuario 2', '5678')
ON CONFLICT DO NOTHING;

-- Tabla de ciclos menstruales
CREATE TABLE IF NOT EXISTS menstrual_cycles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  cycle_length INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas rápidas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_cycles_user_date ON menstrual_cycles(user_id, start_date DESC);

-- Tabla de momentos íntimos
CREATE TABLE IF NOT EXISTS intimate_moments (
  id SERIAL PRIMARY KEY,
  moment_date TIMESTAMP NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_moments_date ON intimate_moments(moment_date DESC);

-- Tabla de ideas de citas personalizadas
CREATE TABLE IF NOT EXISTS custom_date_ideas (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  difficulty VARCHAR(50),
  description TEXT,
  emoji VARCHAR(10),
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de ideas de comidas personalizadas
CREATE TABLE IF NOT EXISTS custom_meal_ideas (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(50),
  difficulty VARCHAR(50),
  time VARCHAR(50),
  ingredients TEXT, -- JSON string
  description TEXT,
  emoji VARCHAR(10),
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de favoritos
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- 'date' o 'meal'
  item_id VARCHAR(50) NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

-- Índice para búsquedas de favoritos por usuario
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- Tabla de puntajes de juegos
CREATE TABLE IF NOT EXISTS game_scores (
  id SERIAL PRIMARY KEY,
  game_name VARCHAR(100),
  player_name VARCHAR(100),
  score INTEGER,
  played_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas por juego
CREATE INDEX IF NOT EXISTS idx_scores_game ON game_scores(game_name, played_at DESC);

-- Tabla de medicamentos/pastillas
CREATE TABLE IF NOT EXISTS medications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(50),
  times TEXT, -- JSON array de horarios ["09:00", "21:00"]
  notes TEXT,
  color VARCHAR(20) DEFAULT '#ff6b9d',
  icon VARCHAR(10) DEFAULT '💊',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas de medicamentos por usuario
CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id, is_active);

-- Tabla de suscripciones Push (para notificaciones)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de configuración del ciclo menstrual
CREATE TABLE IF NOT EXISTS cycle_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  period_duration INTEGER DEFAULT 5,
  cycle_duration INTEGER DEFAULT 28,
  last_period_start DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de notas del ciclo (síntomas, actividad sexual, etc.)
CREATE TABLE IF NOT EXISTS cycle_notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  note_type VARCHAR(50) NOT NULL, -- 'period', 'intimate', 'symptom', 'note'
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas de notas por fecha
CREATE INDEX IF NOT EXISTS idx_cycle_notes_date ON cycle_notes(user_id, note_date);

-- Índice para búsquedas de suscripciones por usuario
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Tabla de historial de medicamentos tomados
CREATE TABLE IF NOT EXISTS medication_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  medication_id INTEGER REFERENCES medications(id) ON DELETE CASCADE,
  medication_name VARCHAR(200),
  taken_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas de historial por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_date ON medication_logs(user_id, taken_at DESC);

-- Verificar que todo se creó correctamente
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Todas las tablas se crearon correctamente';
  RAISE NOTICE 'Tablas creadas: users, menstrual_cycles, intimate_moments, custom_date_ideas, custom_meal_ideas, favorites, game_scores, medications, medication_logs';
END $$;
