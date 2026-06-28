// app/api/push/unsubscribe/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { removeSubscription } from '@/lib/push';

const VISITOR_COOKIE = 'wc26_visitor';

export async function POST() {
  const visitorId = cookies().get(VISITOR_COOKIE)?.value;
  if (visitorId) {
    await removeSubscription(visitorId);
  }
  return NextResponse.json({ ok: true });
}
