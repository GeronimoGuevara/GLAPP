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
    
    if (!VAPID_PUBLIC_KEY) {
      toast.error('Error: Las llaves maestras de Vercel/Netlify no se cargaron durante la construcción. ¡Asegúrate de agregar VITE_VAPID_PUBLIC_KEY en la configuración de Entorno y VUELVE A COMPILAR el sitio!', { duration: 8000 });
      return;
    }

    if (!subscription) {
      // Suscribirse al servicio Push
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // Enviar la suscripción a nuestro backend en Netlify
    const response = await fetch('/.netlify/functions/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        userId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error desde el servidor de Netlify:', errorData);
      toast.error('Error al conectar con el servidor de notificaciones.');
      return;
    }

    console.log('Suscripción Push enviada al servidor');
    toast.success('¡Dispositivo conectado al servidor de Notificaciones!');
  } catch (error) {
    console.error('Error suscribiendo a Push:', error);
  }
}

/**
 * Pide al servidor de Netlify que envíe una notificación Push REAL e inmediata a este dispositivo. 
 * Sirve para probar si el backend y las llaves VAPID están bien configuradas.
 */
export async function testRealPushNotification(userId) {
  try {
    const toastId = toast.loading('Enviando petición de prueba al servidor...');
    const response = await fetch('/.netlify/functions/test-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      toast.success(`¡Push enviado! Revisa si llegó la notificación (Enviados: ${data.sent})`, { id: toastId, duration: 8000 });
    } else {
      console.error('Test Push Error:', data);
      toast.error(`Error del servidor: ${data.error || 'Desconocido'}`, { id: toastId, duration: 8000 });
    }
  } catch (error) {
    console.error('Network Error:', error);
    toast.error('Error de red al intentar probar Push', { duration: 8000 });
  }
}
