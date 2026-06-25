import postgres from 'postgres';
import webpush from 'web-push';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = DATABASE_URL ? postgres(DATABASE_URL, { ssl: 'require', max: 1 }) : null;

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

    if (!sql) {
      console.error('Database URL not configured');
      return res.status(500).json({ success: false, error: 'Missing Database URL' });
    }

    // Obtener la hora actual en zona horaria de Argentina
    const now = new Date();
    const nowARStr = now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' });
    const nowAR = new Date(nowARStr);
    const h = nowAR.getHours();
    const m = nowAR.getMinutes();
    const currentHourMin = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    
    console.log(`Server Time UTC: ${now.toISOString()} | Checking meds for AR Time: ${currentHourMin}`);

    // Obtener la fecha actual de Argentina (YYYY-MM-DD) para los logs
    const currentDateARStr = nowARStr.split(',')[0]; // Format is usually MM/DD/YYYY from toLocaleString, let's format it properly
    const dateObj = new Date(nowARStr);
    const y = dateObj.getFullYear();
    const mo = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const d = dateObj.getDate().toString().padStart(2, '0');
    const todayAR = `${y}-${mo}-${d}`;

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

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS notification_logs (
          medication_id INTEGER,
          notified_date TEXT,
          notified_time TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (medication_id, notified_date, notified_time)
        )
      `;
    } catch (e) {
      console.error('Error creating notification_logs table:', e);
    }

    const medications = await sql`
      SELECT m.id, m.name, m.times, m.user_id, u.name as user_name
      FROM medications m
      JOIN users u ON u.id = m.user_id
      WHERE m.is_active = true
    `;

    const medsToNotify = [];
    
    // Validar cada pastilla contra el historial para evitar spam duplicado
    for (const med of medications) {
      let timesArray = [];
      try {
        timesArray = JSON.parse(med.times) || [];
      } catch (e) {
        if (typeof med.times === 'string') timesArray = [med.times];
      }

      for (const time of timesArray) {
        if (validMinutes.includes(time)) {
          // Chequear si ya se notificó esta pastilla HOY a ESTA HORA
          const logs = await sql`
            SELECT 1 FROM notification_logs 
            WHERE medication_id = ${med.id} 
            AND notified_date = ${todayAR}
            AND notified_time = ${time}
          `;
          
          if (logs.length === 0) {
            // No notificada todavía
            medsToNotify.push({
              medicationId: med.id,
              medicationName: med.name,
              userId: med.user_id,
              userName: med.user_name,
              time: time
            });
            
            // Loguear que YA FUE NOTIFICADA (se hace aquí para evitar carreras con el cron)
            try {
              await sql`
                INSERT INTO notification_logs (medication_id, notified_date, notified_time)
                VALUES (${med.id}, ${todayAR}, ${time})
                ON CONFLICT DO NOTHING
              `;
            } catch (e) {
              console.error('Error recording notification log:', e);
            }
          }
        }
      }
    }

    if (medsToNotify.length === 0) {
      return res.status(200).json({ success: true, message: 'No pending medications unsent scheduled within the window' });
    }

    console.log(`Found ${medsToNotify.length} NEW medications to notify:`, medsToNotify);

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
