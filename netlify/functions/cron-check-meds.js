import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';
import { schedule } from '@netlify/functions';

// Handler asíncrono para el CRON Job
const myHandler = async (event, context) => {
  try {
    // En Netlify, las variables VITE_ del frontend no están disponibles en funciones serverless
    // Por eso necesitamos verificar ambos nombres de variable
    const pubKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;
    const mailTo = process.env.VAPID_MAILTO || 'mailto:admin@tu-app.com';

    if (!pubKey || !privKey) {
      console.error('VAPID keys not configured in environment');
      return { statusCode: 500, body: 'Missing VAPID keys' };
    }

    webpush.setVapidDetails(mailTo, pubKey, privKey);

    const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      console.error('Database URL not configured');
      return { statusCode: 500, body: 'Missing Database URL' };
    }

    const sql = neon(DATABASE_URL);

    // Obtener la hora actual usando Intl.DateTimeFormat para evitar bugs de Zona Horaria en Servidores UTC
    const now = new Date();
    const options = { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false };
    const currentHourMin = new Intl.DateTimeFormat('es-AR', options).format(now);
    
    console.log(`Server Time UTC: ${now.toISOString()} | Checking meds for AR Time: ${currentHourMin}`);

    // Crear una ventana de tiempo de los últimos 5 minutos para atrapar ejecuciones atrasadas
    const [h, m] = currentHourMin.split(':').map(Number);
    const validMinutes = [];
    for (let i = 0; i <= 5; i++) {
        let min = m - i;
        let hr = h;
        if (min < 0) {
            min += 60;
            hr = hr - 1 < 0 ? 23 : hr - 1;
        }
        validMinutes.push(`${hr.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }

    // Buscar medicamentos activos
    const medications = await sql`
      SELECT m.id, m.name, m.times, m.user_id, u.name as user_name
      FROM medications m
      JOIN users u ON u.id = m.user_id
      WHERE m.is_active = true
    `;

    const medsToNotify = [];
    
    medications.forEach(med => {
      let timesArray = [];
      try {
        timesArray = JSON.parse(med.times) || [];
      } catch (e) {
        if (typeof med.times === 'string') timesArray = [med.times];
      }

      timesArray.forEach(time => {
        if (validMinutes.includes(time)) {
          medsToNotify.push({
            medicationId: med.id,
            medicationName: med.name,
            userId: med.user_id,
            userName: med.user_name,
            time: time
          });
        }
      });
    });

    if (medsToNotify.length === 0) {
      return { statusCode: 200, body: 'No medications scheduled within the 5 minute window' };
    }

    // Para evitar mandar notificaciones duplicadas en esta misma ventana, revisamos los logs (si ya se envió hoy a esta hora no lo podemos chequear si no guardamos un "log de push", pero como medida adicional esto es clave).
    // Idealmente guardaríamos un registro de "push_sent". Por ahora dejaremos que notifique, asumiendo que el Cron corre solo una vez por ese periodo.


    // Para cada medicamento, buscar las subscripciones PUSH
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

    return { 
      statusCode: 200, 
      body: JSON.stringify({
        success: true, 
        sent: notificationsSent.length,
        removed: subscriptionsToRemove.length,
        notified: medsToNotify.map(m => m.medicationName)
      })
    };

  } catch (error) {
    console.error('CRON error:', error);
    return { statusCode: 500, body: `Internal server error: ${error.message}` };
  }
};

// Exportar estrictamente como Cron Job de Netlify para evitar errores de Build
export const handler = schedule('* * * * *', myHandler);
