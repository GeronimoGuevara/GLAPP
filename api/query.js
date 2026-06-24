import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { checkRateLimit } from './rate-limiter.js';

export default async function handler(req, res) {
  // Configurar CORS por si se llama desde otro origen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
  const JWT_SECRET = process.env.JWT_SECRET || 'glapp-super-secret-key-2026';
  
  if (!DATABASE_URL) {
    return res.status(500).json({ error: 'Database URL not configured' });
  }

  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  // 1. Rate Limiting general (200 peticiones por minuto por IP)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const isAllowed = await checkRateLimit(sql, ip, 200, 60000);
  
  if (!isAllowed) {
    return res.status(429).json({ success: false, error: 'Demasiadas peticiones. Por favor intenta más tarde.' });
  }

  // 2. Auth via JWT
  // Algunas consultas de inicialización y chequeos públicos pueden requerir ignorar JWT
  // Pero la mayoría estará protegida. Para la demo vamos a permitir queries "select email from users"
  // o similares, pero lo ideal es proteger todo. 
  
  const isPublicQuery = query.toLowerCase().includes('select id, name, pin, created_at from users') || 
                        query.toLowerCase().includes('insert into users') ||
                        query.toLowerCase().includes('create table');

  if (!isPublicQuery) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No autorizado. Token faltante.' });
    }

    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, JWT_SECRET);
      // Opcional: Extraer userId y coupleId y pasarlo a los params o validarlo
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Token inválido o expirado.' });
    }
  }

  try {
    const result = await sql.unsafe(query, params || []);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Database query error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
