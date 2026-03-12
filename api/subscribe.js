import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, userId } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      return res.status(500).json({ error: 'Database URL not configured' });
    }

    const sql = neon(DATABASE_URL);

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

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
