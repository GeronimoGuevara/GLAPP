import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const match = envFile.match(/^VITE_DATABASE_URL=(.*)/m);

if (!match) {
  console.error('❌ Error: No se encontró la variable VITE_DATABASE_URL en el archivo .env');
  process.exit(1);
}

const DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, '');
const sql = postgres(DATABASE_URL, { ssl: 'require' });

const tables = [
  'couples', 'users', 'menstrual_cycles', 'intimate_moments',
  'custom_date_ideas', 'custom_meal_ideas', 'favorites',
  'game_scores', 'competitions', 'medications', 'medication_logs',
  'push_subscriptions', 'cycle_settings', 'cycle_notes'
];

async function enableRLS() {
  try {
    console.log('🔒 Activando Row Level Security (RLS) en todas las tablas...');
    for (const table of tables) {
      await sql.unsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      console.log(`✅ RLS activado para la tabla: ${table}`);
    }
    console.log('🎉 ¡Todas las tablas están aseguradas contra accesos públicos de la API!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error activando RLS:', err);
    process.exit(1);
  }
}

enableRLS();
