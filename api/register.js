import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from './rate-limiter.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name, email, pin, gender } = req.body; // 'pin' is now the password

  if (!name || !email || !pin) {
    return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
  }

  const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
  const JWT_SECRET = process.env.JWT_SECRET || 'glapp-super-secret-key-2026';

  if (!DATABASE_URL) return res.status(500).json({ success: false, error: 'Database URL no configurada' });

  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const isAllowed = await checkRateLimit(sql, ip, 10, 60000); 
  
  if (!isAllowed) {
    return res.status(429).json({ success: false, error: 'Demasiados intentos. Por favor espera un minuto.' });
  }

  try {
    const hash = await bcrypt.hash(pin, 10);

    const result = await sql.unsafe(
      `INSERT INTO users (name, email, pin, gender) VALUES ($1, $2, $3, $4) RETURNING *`, 
      [name, email, hash, gender || 'mujer']
    );

    const user = result[0];

    const token = jwt.sign(
      { userId: user.id, coupleId: user.couple_id }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    const { pin: userPin, ...safeUser } = user;
    
    return res.status(200).json({ 
      success: true, 
      token, 
      user: safeUser 
    });

  } catch (error) {
    console.error('Register error:', error);
    if (error.message.includes('unique constraint')) {
      return res.status(400).json({ success: false, error: 'Este correo electrónico ya está registrado.' });
    }
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
