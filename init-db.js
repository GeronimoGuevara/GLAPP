import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

console.log('Intentando conectar con la base de datos...');

const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const match = envFile.match(/^VITE_DATABASE_URL=(.*)/m);

if (!match) {
  console.error('❌ Error: No se encontró la variable VITE_DATABASE_URL en el archivo .env');
  process.exit(1);
}

const DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, '');
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function initDB() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS couples (
      id SERIAL PRIMARY KEY,
      invite_code VARCHAR(20) UNIQUE,
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE,
      pin VARCHAR(4) NOT NULL,
      gender VARCHAR(10) DEFAULT 'mujer',
      couple_id INTEGER REFERENCES couples(id),
      avatar TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS menstrual_cycles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      end_date DATE,
      cycle_length INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS intimate_moments (
      id SERIAL PRIMARY KEY,
      couple_id INTEGER REFERENCES couples(id),
      moment_date TIMESTAMP NOT NULL,
      notes TEXT,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS custom_date_ideas (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(50),
      difficulty VARCHAR(50),
      description TEXT,
      emoji VARCHAR(10),
      image_url TEXT,
      added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS custom_meal_ideas (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      type VARCHAR(50),
      difficulty VARCHAR(50),
      time VARCHAR(50),
      ingredients TEXT,
      description TEXT,
      emoji VARCHAR(10),
      added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      item_type VARCHAR(20),
      item_id VARCHAR(50),
      is_custom BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS game_scores (
      id SERIAL PRIMARY KEY,
      couple_id INTEGER REFERENCES couples(id),
      game_name VARCHAR(100),
      player_name VARCHAR(100),
      score INTEGER,
      played_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS competitions (
      id SERIAL PRIMARY KEY,
      invite_code VARCHAR(20) UNIQUE,
      couple_a_id INTEGER REFERENCES couples(id),
      couple_b_id INTEGER REFERENCES couples(id),
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS medications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      dosage VARCHAR(100),
      frequency VARCHAR(50),
      times TEXT,
      notes TEXT,
      color VARCHAR(20) DEFAULT '#ff6b9d',
      icon VARCHAR(10) DEFAULT '💊',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS medication_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      medication_id INTEGER REFERENCES medications(id) ON DELETE CASCADE,
      medication_name VARCHAR(200),
      taken_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS cycle_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      period_duration INTEGER DEFAULT 5,
      cycle_duration INTEGER DEFAULT 28,
      last_period_start DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS cycle_notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      note_date DATE NOT NULL,
      note_type VARCHAR(50) NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS couple_photos (
      id SERIAL PRIMARY KEY,
      couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'general',
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS api_rate_limits (
      ip VARCHAR(45) PRIMARY KEY,
      request_count INTEGER DEFAULT 1,
      reset_time BIGINT NOT NULL
    )`
  ];

  try {
    console.log('✅ Conexión establecida. Creando tablas...');
    for (const ddlText of tables) {
      // Ejecutar cada DDL por separado usando la API de plain queries
      await sql.unsafe(ddlText);
    }
    console.log('🎉 ¡Todas las tablas se crearon correctamente!');
  } catch (err) {
    console.error('❌ Error al crear las tablas:', err);
  }
}

initDB();
