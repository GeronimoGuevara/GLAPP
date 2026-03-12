self.addEventListener('push', function (event) {
  if (event.data) {
    console.log('Push event!! ', event.data.text());
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Tienes una nueva notificación',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
          url: data.url || '/',
          dateOfArrival: Date.now(),
          primaryKey: '2'
        },
        requireInteraction: true
      };

      event.waitUntil(self.registration.showNotification(data.title || 'GLAPP', options));
    } catch (e) {
      console.error('Error parsing push data', e);
      // Fallback si la data recibida no es JSON
      event.waitUntil(
        self.registration.showNotification('GLAPP', {
          body: event.data.text(),
          icon: '/icon-192.png'
        })
      );
    }
  } else {
    console.log('Push event without data!!');
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');
  
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
