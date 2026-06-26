import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = DATABASE_URL ? postgres(DATABASE_URL, { ssl: 'require', max: 1, idle_timeout: 0, connect_timeout: 10, prepare: false }) : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No autorizado.' });
  }

  const token = authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET || 'glapp-super-secret-key-2026';
  let userId;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token inválido.' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
  }

  const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
  if (!DATABASE_URL) return res.status(500).json({ success: false, error: 'Database URL no configurada' });

  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    const result = await sql.unsafe(`SELECT pin FROM users WHERE id = $1`, [userId]);
    if (result.length === 0) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    const user = result[0];
    const isBcrypt = user.pin.startsWith('$2a$') || user.pin.startsWith('$2b$');
    let isValid = false;

    if (isBcrypt) {
      isValid = await bcrypt.compare(currentPassword, user.pin);
    } else {
      isValid = (user.pin === currentPassword);
    }

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'La contraseña actual es incorrecta' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await sql.unsafe(`UPDATE users SET pin = $1 WHERE id = $2`, [hash, userId]);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
