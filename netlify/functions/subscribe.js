import { neon } from '@neondatabase/serverless';

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
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const { subscription, userId } = JSON.parse(event.body);

    if (!subscription || !subscription.endpoint || !subscription.keys || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database URL not configured' })
      };
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

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ success: true, message: 'Subscribed successfully' })
    };
  } catch (error) {
    console.error('Subscription error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
