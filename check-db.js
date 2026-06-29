import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const match = envFile.match(/^VITE_DATABASE_URL=(.*)/m);
const DATABASE_URL = match ? match[1].trim().replace(/^["']|["']$/g, '') : null;

if (!DATABASE_URL) process.exit(1);

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function check() {
  const result = await sql.unsafe("SELECT data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pin'");
  console.log(result);
  await sql.end();
}
check();
