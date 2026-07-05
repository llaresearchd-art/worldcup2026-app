// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { saveSubscription } from '@/lib/push';
import { getMatches } from '@/lib/cache';
import { getRedis } from '@/lib/redis';
import { isFinished } from '@/lib/match-utils';

const VISITOR_COOKIE = 'wc26_visitor';
const kv = getRedis();

function getOrCreateVisitorId(): string {
  const store = cookies();
  let id = store.get(VISITOR_COOKIE)?.value;
  if (!id) id = randomUUID();
  return id;
}

// When someone subscribes, immediately mark every past/current match event as
// already notified for them specifically. This prevents the "32 notifications at
// once" flood that happens when a new subscriber's first cron run processes the
// entire tournament history as if nothing had ever been sent.
async function baselineNewSubscriber(now: number) {
  try {
    const { data: matches } = await getMatches();
    for (const m of matches) {
      if (!m || m.id == null || !m.utcDate) continue;
      const kickoff = new Date(m.utcDate).getTime();
      const minutesToKickoff = (kickoff - now) / 60_000;
      const prefix = `wc26:notified:${m.id}`;
      const ttl = { ex: 60 * 60 * 24 * 7 };

      if (minutesToKickoff <= 24 * 60) await kv.set(`${prefix}:reminder_24h`, true, ttl);
      if (minutesToKickoff <= 3 * 60) await kv.set(`${prefix}:reminder_3h`, true, ttl);
      if (minutesToKickoff <= 30)     await kv.set(`${prefix}:reminder_30m`, true, ttl);
      if (minutesToKickoff <= 5)      await kv.set(`${prefix}:reminder_5m`, true, ttl);
      if (isFinished(m))              await kv.set(`${prefix}:final_result`, true, ttl);

      // Baseline goal count from current score, not goals array
      const currentScore = (m.score?.fullTime?.home ?? 0) + (m.score?.fullTime?.away ?? 0);
      if (currentScore > 0) {
        await kv.set(`wc26:goalcount:${m.id}`, currentScore, ttl);
      }
    }
  } catch {
    // If baselining fails, don't block the subscription — worst case they get a
    // notification flood, which is annoying but recoverable and not a data loss.
  }
}

export async function POST(req: NextRequest) {
  const visitorId = getOrCreateVisitorId();
  const body = await req.json();
  const { subscription } = body;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription payload.' }, { status: 400 });
  }

  const now = Date.now();

  // Run baseline and save subscription in parallel
  await Promise.all([
    saveSubscription(visitorId, {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    }),
    baselineNewSubscriber(now),
  ]);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}
