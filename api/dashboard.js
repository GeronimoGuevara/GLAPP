import postgres from 'postgres';
import jwt from 'jsonwebtoken';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'glapp-super-secret-key-2026';
const sql = DATABASE_URL ? postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1,
  idle_timeout: 0,
  connect_timeout: 10,
  prepare: false
}) : null;

function daysBetween(start, end, rounding = 'ceil') {
  const diff = start.getTime() - end.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return rounding === 'floor' ? Math.floor(days) : Math.ceil(days);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  if (!sql) return res.status(500).json({ success: false, error: 'Database URL not configured' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No autorizado. Token faltante.' });
  }

  let payload;
  try {
    payload = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token invalido o expirado.' });
  }

  const coupleId = Number(req.body?.coupleId || payload.coupleId);
  if (!coupleId || Number(payload.coupleId) !== coupleId) {
    return res.status(403).json({ success: false, error: 'Pareja no autorizada.' });
  }

  try {
    const [cycles, settings, moments] = await Promise.all([
      sql.unsafe(`
        SELECT mc.start_date
        FROM menstrual_cycles mc
        INNER JOIN users u ON u.id = mc.user_id
        WHERE u.couple_id = $1
        ORDER BY mc.start_date DESC
        LIMIT 1
      `, [coupleId]),
      sql.unsafe(`
        SELECT cycle_duration
        FROM cycle_settings
        LIMIT 1
      `),
      sql.unsafe(`
        SELECT moment_date
        FROM intimate_moments
        WHERE couple_id = $1
        ORDER BY moment_date DESC
        LIMIT 1
      `, [coupleId])
    ]);

    const today = new Date();
    let nextCycleDays = null;
    let lastMomentDays = null;

    if (cycles.length > 0) {
      const cycleLength = Number(settings[0]?.cycle_duration || 28);
      const startDate = new Date(cycles[0].start_date);
      const nextCycleDate = new Date(startDate);
      nextCycleDate.setDate(startDate.getDate() + cycleLength);
      nextCycleDays = daysBetween(nextCycleDate, today, 'ceil');
    }

    if (moments.length > 0) {
      const momentDate = new Date(moments[0].moment_date);
      lastMomentDays = daysBetween(today, momentDate, 'floor');
    }

    return res.status(200).json({
      success: true,
      data: {
        nextCycleDays,
        lastMomentDays
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}