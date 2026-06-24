import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { checkRateLimit } from './rate-limiter.js';

export default async function handler(req, res) {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, pin } = req.body;

  if (!email || !pin) {
    return res.status(400).json({ success: false, error: 'Email y PIN son requeridos' });
  }

  const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
  const JWT_SECRET = process.env.JWT_SECRET || 'glapp-super-secret-key-2026'; // Fallback por si acaso en dev

  if (!DATABASE_URL) {
    return res.status(500).json({ success: false, error: 'Database URL not configured' });
  }

  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  // 1. Rate Limiting (Protección contra fuerza bruta: max 10 intentos por minuto por IP)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const isAllowed = await checkRateLimit(sql, ip, 10, 60000); // 10 peticiones cada 60s
  
  if (!isAllowed) {
    return res.status(429).json({ success: false, error: 'Demasiados intentos. Por favor espera un minuto.' });
  }

  try {
    // 2. Verificar credenciales
    const result = await sql.unsafe(
      `SELECT * FROM users WHERE email ILIKE $1 AND pin = $2`, 
      [email, pin]
    );

    if (result.length === 0) {
      return res.status(401).json({ success: false, error: 'Email o PIN incorrectos' });
    }

    const user = result[0];

    // 3. Generar JWT
    // Incluimos ID y couple_id en el payload
    const token = jwt.sign(
      { userId: user.id, coupleId: user.couple_id }, 
      JWT_SECRET, 
      { expiresIn: '30d' } // Token expira en 30 días
    );

    // Devolvemos el usuario (sin el PIN por seguridad) y el token
    const { pin: userPin, ...safeUser } = user;
    
    // NOTA: Devolvemos el PIN también porque la UI actual lo requiere para el E2EE localmente.
    // Solo se debe hacer en apps confiables sobre HTTPS.
    
    return res.status(200).json({ 
      success: true, 
      token, 
      user: user // Se devuelve el user completo para que el cliente tenga su pin
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
