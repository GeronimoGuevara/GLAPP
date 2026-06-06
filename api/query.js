import postgres from 'postgres';

export default async function handler(req, res) {
  // Configurar CORS por si se llama desde otro origen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query, params } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    return res.status(500).json({ error: 'Database URL not configured' });
  }

  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    const result = await sql.unsafe(query, params || []);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Database query error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
