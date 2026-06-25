import postgres from 'postgres';
import webpush from 'web-push';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = DATABASE_URL ? postgres(DATABASE_URL, { ssl: 'require', max: 1 }) : null;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const pubKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;
    const mailTo = process.env.VAPID_MAILTO || 'mailto:admin@tu-app.com';

    if (!pubKey || !privKey) {
      return res.status(500).json({ error: 'Missing VAPID keys' });
    }

    webpush.setVapidDetails(mailTo, pubKey, privKey);

    if (!sql) {
      return res.status(500).json({ error: 'Database URL not configured' });
    }

    // Buscar las subscripciones del usuario
    const subs = await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = ${userId}
    `;

    if (subs.length === 0) {
      return res.status(404).json({ error: 'No push subscriptions found for this user' });
    }

    const notificationPayload = JSON.stringify({
      title: '✅ Prueba Exitosa',
      body: '¡La conexión en segundo plano funciona perfectamente!',
      url: '/#medications'
    });

    let sent = 0;
    const errors = [];

    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
        sent++;
      } catch (error) {
        console.error(`Error sending push to ${sub.endpoint}:`, error);
        errors.push(error.message);
      }
    }

    return res.status(200).json({ success: true, sent, errors });
  } catch (error) {
    console.error('Test Push error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
