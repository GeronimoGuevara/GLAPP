// Sistema de notificaciones push para recordatorios de medicamentos

/**
 * Verifica si las notificaciones están habilitadas y solicita permiso si se requiere
 * @param {boolean} request - Si es true, solicita permiso al usuario
 * @returns {Promise<boolean>} - true si las notificaciones están habilitadas
 */
export async function checkNotificationPermission(request = false) {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (request && Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Programa una notificación para un medicamento a una hora específica
 * @param {string|number} medicationId - ID del medicamento
 * @param {string} medicationName - Nombre del medicamento
 * @param {string} time - Hora en formato HH:mm
 */
export function scheduleNotification(medicationId, medicationName, time) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

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
  if (Notification.permission !== 'granted') return;

  const notification = new Notification('💊 Hora de tu medicamento', {
    body: `Es hora de tomar: ${medicationName}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `med-${medicationName}-${time}`,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      medicationName,
      time,
      timestamp: new Date().toISOString()
    }
  });

  notification.onclick = function() {
    window.focus();
    this.close();
    // Navegar a la sección de medicamentos
    window.location.hash = '#medications';
  };

  // Auto-cerrar después de 30 segundos si no se interactúa
  setTimeout(() => notification.close(), 30000);
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
  if (Notification.permission !== 'granted') {
    alert('Las notificaciones no están habilitadas');
    return;
  }

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
    if (Notification.permission === 'granted') {
      restoreNotifications();
    }
  });
}
