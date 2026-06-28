'use client';
// components/NotificationOptIn.tsx
//
// Handles the browser-side half of push notifications: asking permission,
// registering the service worker, subscribing, and sending that subscription
// to our server to store.
import { useEffect, useState } from 'react';

type Status = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed' | 'loading';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationOptIn() {
  const [status, setStatus] = useState<Status>('default');
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    // Check if we already have an active subscription
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setStatus('subscribed');
      } else {
        setStatus(Notification.permission === 'granted' ? 'granted' : 'default');
      }
    });

    fetch('/api/push/public-key')
      .then((r) => r.json())
      .then((d) => setVapidPublicKey(d.publicKey))
      .catch(() => setErrorMsg('Notifications are not configured yet.'));
  }, []);

  async function handleEnable() {
    setStatus('loading');
    setErrorMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'default');
        return;
      }

      if (!vapidPublicKey) {
        setErrorMsg('Notifications are not configured on the server yet.');
        setStatus('default');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      setStatus('subscribed');
    } catch (err) {
      setErrorMsg('Could not enable notifications. Try again, or check your browser settings.');
      setStatus('default');
    }
  }

  async function handleDisable() {
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch('/api/push/unsubscribe', { method: 'POST' });
      setStatus('granted');
    } catch {
      setStatus('subscribed');
    }
  }

  if (status === 'unsupported') return null;

  if (status === 'denied') {
    return (
      <div className="rounded-xl border border-chalk/10 bg-pitch-dark/30 px-4 py-3 text-center text-xs text-chalk/40">
        Notifications are blocked in your browser settings. Enable them for this site to get match alerts.
      </div>
    );
  }

  if (status === 'subscribed') {
    return (
      <button
        onClick={handleDisable}
        className="w-full rounded-xl border border-floodlight/30 bg-floodlight/10 px-4 py-3 text-center text-xs font-medium text-floodlight"
      >
        🔔 Notifications on — tap to turn off
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleEnable}
        disabled={status === 'loading'}
        className="w-full rounded-xl border border-chalk/15 bg-pitch-dark/30 px-4 py-3 text-center text-xs font-medium text-chalk/80 transition-colors hover:border-floodlight/40 disabled:opacity-50"
      >
        {status === 'loading' ? 'Setting up…' : '🔔 Get match reminders & goal alerts'}
      </button>
      {errorMsg && <p className="mt-1.5 text-center text-[10px] text-goal">{errorMsg}</p>}
    </div>
  );
}
