// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { saveSubscription } from '@/lib/push';

const VISITOR_COOKIE = 'wc26_visitor';

function getOrCreateVisitorId(): string {
  const store = cookies();
  let id = store.get(VISITOR_COOKIE)?.value;
  if (!id) {
    id = randomUUID();
  }
  return id;
}

export async function POST(req: NextRequest) {
  const visitorId = getOrCreateVisitorId();
  const body = await req.json();
  const { subscription } = body;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription payload.' }, { status: 400 });
  }

  await saveSubscription(visitorId, {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}
