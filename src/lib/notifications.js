// Sistema de notificaciones push para recordatorios de medicamentos
import toast from 'react-hot-toast';

// Clave pública VAPID (deberías obtenerla de tus variables de entorno)
const { VITE_VAPID_PUBLIC_KEY } = import.meta.env;
const VAPID_PUBLIC_KEY = VITE_VAPID_PUBLIC_KEY;

// Utilidad para convertir la clave VAPID
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica si las notificaciones están habilitadas y solicita permiso si se requiere
 * Suscribe al usuario al servicio Web Push si el permiso es concedido
 * @param {boolean} request - Si es true, solicita permiso al usuario
 * @param {string|number} userId - ID del usuario activo
 * @returns {Promise<boolean>} - true si las notificaciones están habilitadas
 */
export async function checkNotificationPermission(request = false, userId = null) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Este navegador no soporta Notificaciones Web Push');
    return false;
  }

  let permission = Notification.permission;

  if (request && permission !== 'granted' && permission !== 'denied') {
    permission = await Notification.requestPermission();
  }

  if (permission === 'granted' && userId) {
    await subscribeToPush(userId);
    return true;
  }

  return permission === 'granted';
}

async function subscribeToPush(userId) {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Verificar si ya está suscrito
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Suscribirse al servicio Push
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // Enviar la suscripción a nuestro backend (Vercel serverless function)
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        userId
      })
    });
    
    console.log('Suscripción Push enviada al servidor');
  } catch (error) {
    console.error('Error suscribiendo a Push:', error);
  }
}

/**
 * Programa una notificación para un medicamento a una hora específica
 * @param {string|number} medicationId - ID del medicamento
 * @param {string} medicationName - Nombre del medicamento
 * @param {string} time - Hora en formato HH:mm
 */
export function scheduleNotification(medicationId, medicationName, time) {
  // Sin validación de Notification en ventana porque usamos Toasts in-app

  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  // Si la hora ya pasó hoy, programar para mañana
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delay = scheduledTime.getTime() - now.getTime();

  // Guardar el timeout ID para poder cancelarlo después
  const timeoutId = setTimeout(() => {
    showNotification(medicationName, time);
    // Re-programar para el día siguiente
    scheduleNotification(medicationId, medicationName, time);
  }, delay);

  // Guardar en localStorage para persistencia
  const notifications = getStoredNotifications();
  notifications[`${medicationId}-${time}`] = {
    medicationId,
    medicationName,
    time,
    timeoutId,
    nextScheduled: scheduledTime.toISOString()
  };
  localStorage.setItem('scheduledNotifications', JSON.stringify(notifications));

  return timeoutId;
}

/**
 * Muestra una notificación inmediata
 * @param {string} medicationName - Nombre del medicamento
 * @param {string} time - Hora programada
 */
function showNotification(medicationName, time) {
  toast.success(`Es hora de tomar: ${medicationName}`, {
    icon: '💊',
    duration: 15000,
    style: {
      borderRadius: '10px',
      background: '#fff',
      color: '#ff6b9d',
      border: '1px solid #ffb3c6',
      fontWeight: 'bold',
      padding: '16px'
    },
  });
}

/**
 * Cancela todas las notificaciones programadas para un medicamento
 * @param {string|number} medicationId - ID del medicamento
 */
export async function cancelNotification(medicationId) {
  const notifications = getStoredNotifications();
  
  Object.keys(notifications).forEach(key => {
    if (key.startsWith(`${medicationId}-`)) {
      const notif = notifications[key];
      if (notif.timeoutId) {
        clearTimeout(notif.timeoutId);
      }
      delete notifications[key];
    }
  });

  localStorage.setItem('scheduledNotifications', JSON.stringify(notifications));
}

/**
 * Cancela todas las notificaciones programadas
 */
export function cancelAllNotifications() {
  const notifications = getStoredNotifications();
  
  Object.values(notifications).forEach(notif => {
    if (notif.timeoutId) {
      clearTimeout(notif.timeoutId);
    }
  });

  localStorage.removeItem('scheduledNotifications');
}

/**
 * Re-programa todas las notificaciones guardadas (útil al recargar la página)
 */
export function restoreNotifications() {
  const notifications = getStoredNotifications();
  const now = new Date();

  Object.entries(notifications).forEach(([key, notif]) => {
    const nextScheduled = new Date(notif.nextScheduled);
    
    // Si la notificación ya pasó, re-programar para hoy/mañana
    if (nextScheduled <= now) {
      scheduleNotification(notif.medicationId, notif.medicationName, notif.time);
    } else {
      // Mantener la programación existente
      const delay = nextScheduled.getTime() - now.getTime();
      const timeoutId = setTimeout(() => {
        showNotification(notif.medicationName, notif.time);
        scheduleNotification(notif.medicationId, notif.medicationName, notif.time);
      }, delay);

      notifications[key].timeoutId = timeoutId;
    }
  });

  localStorage.setItem('scheduledNotifications', JSON.stringify(notifications));
}

/**
 * Obtiene las notificaciones almacenadas
 * @returns {Object} - Objeto con las notificaciones programadas
 */
function getStoredNotifications() {
  try {
    const stored = localStorage.getItem('scheduledNotifications');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error leyendo notificaciones:', error);
    return {};
  }
}

/**
 * Envía una notificación de prueba
 */
export function sendTestNotification() {
  showNotification('Medicamento de Prueba', 'Ahora');
}

/**
 * Obtiene el estado de las notificaciones programadas
 * @returns {Array} - Array con información de notificaciones activas
 */
export function getScheduledNotificationsInfo() {
  const notifications = getStoredNotifications();
  return Object.entries(notifications).map(([key, notif]) => ({
    key,
    medicationName: notif.medicationName,
    time: notif.time,
    nextScheduled: new Date(notif.nextScheduled)
  }));
}

// Re-programar notificaciones al cargar la página
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    restoreNotifications();
  });
}
