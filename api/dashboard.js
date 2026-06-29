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
    const rows = await sql.unsafe(`
      WITH latest_cycle AS (
        SELECT mc.start_date
        FROM menstrual_cycles mc
        INNER JOIN users u ON u.id = mc.user_id
        WHERE u.couple_id = $1
        ORDER BY mc.start_date DESC
        LIMIT 1
      ), cycle_config AS (
        SELECT COALESCE(cycle_duration, 28) AS cycle_duration
        FROM cycle_settings
        LIMIT 1
      ), latest_moment AS (
        SELECT moment_date
        FROM intimate_moments
        WHERE couple_id = $1
        ORDER BY moment_date DESC
        LIMIT 1
      )
      SELECT
        (SELECT start_date FROM latest_cycle) AS cycle_start_date,
        COALESCE((SELECT cycle_duration FROM cycle_config), 28) AS cycle_duration,
        (SELECT moment_date FROM latest_moment) AS moment_date
    `, [coupleId]);

    const dashboard = rows[0] || {};
    const today = new Date();
    let nextCycleDays = null;
    let lastMomentDays = null;

    if (dashboard.cycle_start_date) {
      const startDate = new Date(dashboard.cycle_start_date);
      const nextCycleDate = new Date(startDate);
      nextCycleDate.setDate(startDate.getDate() + Number(dashboard.cycle_duration || 28));
      nextCycleDays = daysBetween(nextCycleDate, today, 'ceil');
    }

    if (dashboard.moment_date) {
      lastMomentDays = daysBetween(today, new Date(dashboard.moment_date), 'floor');
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