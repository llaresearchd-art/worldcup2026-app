// lib/push.ts
//
// Wraps the `web-push` library, which implements the Web Push protocol (VAPID auth +
// encrypted payloads). This is the standard, browser-native way to send notifications
// to a phone/desktop without needing a native app or App Store listing.
import webpush from 'web-push';
import { getRedis } from './redis';

const kv = getRedis();

function ensureVapidConfigured() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set. Visit /api/push/generate-keys once ' +
        'to generate them, then add them as environment variables in Vercel and redeploy.'
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const SUBS_SET_KEY = 'wc26:push:subscriptions'; // set of visitor IDs with a subscription
const SUB_PREFIX = 'wc26:push:sub:'; // wc26:push:sub:{visitorId} -> subscription JSON

export async function saveSubscription(visitorId: string, sub: PushSubscriptionRecord) {
  await kv.set(`${SUB_PREFIX}${visitorId}`, sub);
  await kv.sadd(SUBS_SET_KEY, visitorId);
}

export async function removeSubscription(visitorId: string) {
  await kv.del(`${SUB_PREFIX}${visitorId}`);
  await kv.srem(SUBS_SET_KEY, visitorId);
}

export async function getAllSubscriptions(): Promise<{ visitorId: string; sub: PushSubscriptionRecord }[]> {
  const ids = (await kv.smembers(SUBS_SET_KEY)) as string[];
  if (!ids || ids.length === 0) return [];

  const results = await Promise.all(
    ids.map(async (id) => {
      const sub = await kv.get<PushSubscriptionRecord>(`${SUB_PREFIX}${id}`);
      return sub ? { visitorId: id, sub } : null;
    })
  );
  return results.filter((r): r is { visitorId: string; sub: PushSubscriptionRecord } => r !== null);
}

export interface NotificationAction {
  action: string;
  title: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  matchId?: string;
  actions?: NotificationAction[];
}

// Sends to every subscribed visitor. If a subscription has expired or been revoked
// (the browser/user unsubscribed), we clean it up automatically instead of retrying
// it forever.
export async function broadcastNotification(payload: NotificationPayload): Promise<{ sent: number; removed: number }> {
  ensureVapidConfigured();
  const all = await getAllSubscriptions();
  let sent = 0;
  let removed = 0;

  await Promise.all(
    all.map(async ({ visitorId, sub }) => {
      try {
        await webpush.sendNotification(sub as any, JSON.stringify(payload));
        sent += 1;
      } catch (err: any) {
        // 404/410 means the subscription is gone for good - clean it up.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await removeSubscription(visitorId);
          removed += 1;
        }
        // Other errors (rate limiting, transient network) are left alone -
        // we'll just try again on the next scheduled run.
      }
    })
  );

  return { sent, removed };
}
