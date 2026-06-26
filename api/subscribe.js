import postgres from 'postgres';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = DATABASE_URL ? postgres(DATABASE_URL, { ssl: 'require', max: 1, idle_timeout: 0, connect_timeout: 10, prepare: false }) : null;

export default async function handler(req, res) {
  // CORS check (Vercel automatically handles some, but good to be safe)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, userId } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!sql) {
      return res.status(500).json({ error: 'Database URL not configured' });
    }

    // Verificar si la tabla push_subscriptions existe, si no crearla
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
    } catch (tableError) {
      console.log('Table check/creation:', tableError.message);
    }

    // Verificar si ya existe esa suscripción
    const existing = await sql`
      SELECT id FROM push_subscriptions 
      WHERE endpoint = ${subscription.endpoint}
    `;

    if (existing.length === 0) {
      // Registrar la nueva suscripción
      await sql`
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
        VALUES (
          ${userId}, 
          ${subscription.endpoint}, 
          ${subscription.keys.p256dh}, 
          ${subscription.keys.auth}
        )
      `;
    } else {
      // Actualizar el user_id por si cambió de cuenta en el mismo dispositivo
      await sql`
        UPDATE push_subscriptions
        SET user_id = ${userId}
        WHERE endpoint = ${subscription.endpoint}
      `;
    }

    return res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
