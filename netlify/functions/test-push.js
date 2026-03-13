import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';

export const handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing userId' }) };
    }

    // En Netlify, las variables VITE_ del frontend no están disponibles en funciones serverless
    // Por eso necesitamos verificar ambos nombres de variable
    // IMPORTANTE: Si cambias la clave, los usuarios deben volver a suscribirse a push
    const pubKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;
    const mailTo = process.env.VAPID_MAILTO || 'mailto:admin@tu-app.com';

    if (!pubKey || !privKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing VAPID keys' }) };
    }

    webpush.setVapidDetails(mailTo, pubKey, privKey);

    const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Database URL not configured' }) };
    }

    const sql = neon(DATABASE_URL);

    // Buscar las subscripciones del usuario
    const subs = await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = ${userId}
    `;

    if (subs.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'No push subscriptions found for this user' }) };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, sent, errors })
    };
  } catch (error) {
    console.error('Test Push error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
