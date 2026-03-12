import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

console.log('Intentando conectar con la base de datos...');

// Cargar .env manualmente (ya que estamos fuera de Vite)
const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const match = envFile.match(/VITE_DATABASE_URL=(.*)/);

if (!match) {
  console.error('❌ Error: No se encontró la variable VITE_DATABASE_URL en el archivo .env');
  process.exit(1);
}

// Limpiar comillas si las hay
const DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, '');
const sql = neon(DATABASE_URL);

async function initDB() {
  const tables = [
    \`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      pin VARCHAR(4) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )\`,
    
    \`CREATE TABLE IF NOT EXISTS menstrual_cycles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      end_date DATE,
      cycle_length INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )\`,
    
    \`CREATE TABLE IF NOT EXISTS intimate_moments (
      id SERIAL PRIMARY KEY,
      moment_date TIMESTAMP NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )\`,
    
    \`CREATE TABLE IF NOT EXISTS custom_date_ideas (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(50),
      difficulty VARCHAR(50),
      description TEXT,
      emoji VARCHAR(10),
      added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )\`,
    
    \`CREATE TABLE IF NOT EXISTS custom_meal_ideas (
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
    )\`,
    
    \`CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      item_type VARCHAR(20),
      item_id VARCHAR(50),
      is_custom BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )\`,
    
    \`CREATE TABLE IF NOT EXISTS game_scores (
      id SERIAL PRIMARY KEY,
      game_name VARCHAR(100),
      player_name VARCHAR(100),
      score INTEGER,
      played_at TIMESTAMP DEFAULT NOW()
    )\`,
    
    \`CREATE TABLE IF NOT EXISTS medications (
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
    )\`,
    
    \`CREATE TABLE IF NOT EXISTS medication_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      medication_id INTEGER REFERENCES medications(id) ON DELETE CASCADE,
      medication_name VARCHAR(200),
      taken_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )\`
  ];

  try {
    console.log('✅ Conexión establecida. Creando tablas...');
    for (const ddlText of tables) {
      await sql(ddlText);
    }
    console.log('🎉 ¡Todas las tablas se crearon correctamente!');
  } catch (err) {
    console.error('❌ Error al crear las tablas:', err);
  }
}

initDB();
