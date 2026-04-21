import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';

export default async function handler(req, res) {
  // Removido el chequeo estricto estático de CRON_SECRET para asegurar
  // que servicios externos como cron-job.org siempre puedan ejecutar el código.

  try {
    // VAPID keys for Web Push
    const pubKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;
    const mailTo = process.env.VAPID_MAILTO || 'mailto:admin@tu-app.com';

    if (!pubKey || !privKey) {
      console.error('VAPID keys not configured in environment');
      return res.status(500).json({ success: false, error: 'Missing VAPID keys' });
    }

    webpush.setVapidDetails(mailTo, pubKey, privKey);

    const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      console.error('Database URL not configured');
      return res.status(500).json({ success: false, error: 'Missing Database URL' });
    }

    const sql = neon(DATABASE_URL);

    // Obtener la hora actual en zona horaria de Argentina
    const now = new Date();
    const nowARStr = now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' });
    const nowAR = new Date(nowARStr);
    const h = nowAR.getHours();
    const m = nowAR.getMinutes();
    const currentHourMin = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    
    console.log(`Server Time UTC: ${now.toISOString()} | Checking meds for AR Time: ${currentHourMin}`);

    // Crear ventana de 15 minutos hacia atrás
    const validMinutes = [];
    for (let i = 0; i <= 15; i++) {
        let min = m - i;
        let hr = h;
        if (min < 0) {
            min += 60;
            hr = hr - 1 < 0 ? 23 : hr - 1;
        }
        validMinutes.push(`${hr.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }

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
      return res.status(200).json({ success: true, message: 'No medications scheduled within the 5 minute window' });
    }

    console.log(`Found ${medsToNotify.length} medications to notify:`, medsToNotify);

    const notificationsSent = [];
    const subscriptionsToRemove = [];

    for (const med of medsToNotify) {
      let subs = [];
      try {
        subs = await sql`
          SELECT endpoint, p256dh, auth
          FROM push_subscriptions
          WHERE user_id = ${med.userId}
        `;
      } catch (tableError) {
        console.error('Error accessing push_subscriptions table, attempting to create it', tableError);
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
          console.log('Created push_subscriptions table');
        } catch (createError) {
          console.error('Error creating push_subscriptions table:', createError);
        }
        continue;
      }

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
          await webpush.sendNotification(pushSubscription, notificationPayload, {
            urgency: 'high',
            TTL: 86400 // 24 hours
          });
          notificationsSent.push(sub.endpoint);
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            subscriptionsToRemove.push(sub.endpoint);
          }
        }
      });

      await Promise.all(pushPromises);
    }

    if (subscriptionsToRemove.length > 0) {
      try {
        await sql`
          DELETE FROM push_subscriptions
          WHERE endpoint = ANY(${subscriptionsToRemove})
        `;
      } catch (deleteError) {
        console.error('Error deleting dead subscriptions:', deleteError);
      }
    }

    return res.status(200).json({
      success: true, 
      sent: notificationsSent.length,
      removed: subscriptionsToRemove.length,
      notified: medsToNotify.map(m => m.medicationName)
    });

  } catch (error) {
    console.error('CRON error:', error);
    return res.status(500).json({ success: false, error: `Internal server error: ${error.message}` });
  }
}
