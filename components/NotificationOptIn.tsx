'use client';
// components/NotificationOptIn.tsx
import { useEffect, useState } from 'react';

type Status = 'unsupported' | 'checking' | 'default' | 'subscribed' | 'denied' | 'loading';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationOptIn() {
  const [status, setStatus] = useState<Status>('checking');
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }

    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? 'subscribed' : 'default');
    });

    fetch('/api/push/public-key')
      .then(r => r.json())
      .then(d => setVapidKey(d.publicKey))
      .catch(() => {});
  }, []);

  async function enable() {
    setStatus('loading');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { setStatus(perm === 'denied' ? 'denied' : 'default'); return; }
    if (!vapidKey) { setStatus('default'); return; }
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub }),
    });
    setStatus('subscribed');
  }

  async function disable() {
    setStatus('loading');
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await fetch('/api/push/unsubscribe', { method: 'POST' });
    setStatus('default');
  }

  if (status === 'unsupported' || status === 'checking') return null;

  if (status === 'denied') return (
    <p className="text-center text-[11px] text-chalk/30">
      Notifications blocked — enable in browser settings to get match alerts.
    </p>
  );

  if (status === 'subscribed') return (
    <button onClick={disable}
      className="w-full rounded-xl border border-floodlight/30 bg-floodlight/10 px-4 py-3 text-center text-xs font-medium text-floodlight">
      🔔 Notifications on — tap to turn off
    </button>
  );

  return (
    <button onClick={enable} disabled={status === 'loading'}
      className="w-full rounded-xl border border-chalk/10 bg-pitch-dark/30 px-4 py-3 text-center text-xs font-medium text-chalk/70 disabled:opacity-50">
      {status === 'loading' ? 'Setting up…' : '🔔 Get match alerts & goal notifications'}
    </button>
  );
}
