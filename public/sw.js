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
    data: { url: payload.url || '/', matchId: payload.matchId || null },
    tag: payload.tag || undefined, // same tag replaces a prior un-dismissed notification, avoiding duplicate spam
    renotify: Boolean(payload.tag),
    // Prediction notifications include up to 2 quick-pick buttons (browsers cap the
    // number of action buttons shown, commonly around 2), plus tapping the
    // notification body itself opens the app where all 3 options (including the
    // one that didn't fit as a button) are always available.
    actions: Array.isArray(payload.actions) ? payload.actions : undefined,
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'World Cup Update', options));
});

self.addEventListener('notificationclick', (event) => {
  const matchId = event.notification.data && event.notification.data.matchId;
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.notification.close();

  // A prediction action button was tapped directly (e.g. "Brazil" or "Japan") -
  // submit that pick to our server right away, without needing the app to be open.
  if (event.action && event.action.startsWith('predict:') && matchId) {
    const pick = event.action.replace('predict:', '');
    event.waitUntil(
      fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin', // service worker fetch() defaults to omitting cookies -
        // without this, the server can't tell who's submitting the prediction
        body: JSON.stringify({ matchId, pick }),
      }).catch(() => {
        // If this fails (offline, etc), the person can still open the app and
        // predict normally - this isn't the only way to submit a pick.
      })
    );
    return;
  }

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
