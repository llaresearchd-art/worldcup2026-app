// public/sw.js
//
// This is the service worker - a small script the browser runs in the background,
// separate from the app itself, even when the app/tab is closed. It's the piece
// that actually makes push notifications possible.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'World Cup Update', body: '', url: '/' };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    payload.body = event.data ? event.data.text() : '';
  }

  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || undefined, // same tag replaces a prior un-dismissed notification, avoiding duplicate spam
    renotify: Boolean(payload.tag),
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'World Cup Update', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
