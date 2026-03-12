import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';

export default async function handler(req, res) {
  // Solo debe poder ser llamado internamente o con un CRON Secret
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Validar auth (Opcional pero recomendado para llamadas externas)
  if (
    process.env.CRON_SECRET &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const pubKey = process.env.VITE_VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;
    const mailTo = process.env.VAPID_MAILTO || 'mailto:example@yourdomain.org';

    if (!pubKey || !privKey) {
      return res.status(500).json({ error: 'VAPID keys not configured in environment' });
    }

    webpush.setVapidDetails(mailTo, pubKey, privKey);

    const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      return res.status(500).json({ error: 'Database URL not configured' });
    }

    const sql = neon(DATABASE_URL);

    // Obtener la hora actual en formato 'HH:mm'
    // IMPORTANTE: Considerar la zona horaria. Vercel corre en UTC.
    // Asumiremos que el usuario configuró la hora en su zona horaria (ej: Argentina UTC-3)
    // Para simplificar, convertimos la hora actual a UTC-3
    const now = new Date();
    // Offset de Argentina es UTC-3 (puede necesitar ajuste según la región real)
    now.setHours(now.getHours() - 3);
    
    const currentHourMin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Verificamos un rango de 5 minutos para que el cron job no se salte ninguna pastilla
    console.log(`Checking meds around: ${currentHourMin}`);

    // Buscar medicamentos activos
    const medications = await sql`
      SELECT m.id, m.name, m.times, m.user_id, u.name as user_name
      FROM medications m
      JOIN users u ON u.id = m.user_id
      WHERE m.is_active = true
    `;

      let timesArray = [];
      try {
        timesArray = JSON.parse(med.times) || [];
      } catch (e) {
        if (typeof med.times === 'string') timesArray = [med.times];
      }

      timesArray.forEach(time => {
        // En un entorno de producción real mediríamos la dif. en minutos exactos
        if (time === currentHourMin) {
          medsToNotify.push({
            medicationId: med.id,
            medicationName: med.name,
            userId: med.user_id,
            userName: med.user_name,
            time: time
          });
        }
      });
    }

    if (medsToNotify.length === 0) {
      return res.status(200).json({ message: 'No medications schedule for right now' });
    }

    // Para cada medicamento, buscar las subscripciones PUSH del usuario correspondiente
    const notificationsSent = [];
    const subscriptionsToRemove = [];

    for (const med of medsToNotify) {
      const subs = await sql`
        SELECT endpoint, p256dh, auth
        FROM push_subscriptions
        WHERE user_id = ${med.userId}
      `;

      const notificationPayload = JSON.stringify({
        title: '💊 Hora de tu pastilla',
        body: `¡${med.userName}, te toca tomar ${med.medicationName}!`,
        url: '/#medications',
        medicationId: med.medicationId
      });

      const pushPromises = subs.map(async sub => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload);
          notificationsSent.push(sub.endpoint);
        } catch (error) {
          console.error(`Error sending push to ${sub.endpoint}:`, error);
          if (error.statusCode === 404 || error.statusCode === 410) {
            // Subscription has expired
            subscriptionsToRemove.push(sub.endpoint);
          }
        }
      });

      await Promise.all(pushPromises);
    }

    // Cleanup de subscripciones muertas
    if (subscriptionsToRemove.length > 0) {
      await sql`
        DELETE FROM push_subscriptions
        WHERE endpoint = ANY(${subscriptionsToRemove})
      `;
    }

    res.status(200).json({ 
      success: true, 
      sent: notificationsSent.length,
      removed: subscriptionsToRemove.length,
      notified: medsToNotify.map(m => m.medicationName)
    });

  } catch (error) {
    console.error('CRON error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
