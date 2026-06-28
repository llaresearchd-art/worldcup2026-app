// app/api/tip-seen/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getRedis } from '@/lib/redis';

const VISITOR_COOKIE = 'wc26_visitor';
const kv = getRedis();

function getOrCreateVisitorId(): string {
  const store = cookies();
  let id = store.get(VISITOR_COOKIE)?.value;
  if (!id) {
    id = randomUUID();
  }
  return id;
}

export async function GET() {
  const visitorId = getOrCreateVisitorId();
  const seen = await kv.get(`wc26:tipseen:${visitorId}`);
  const res = NextResponse.json({ seen: Boolean(seen) });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}

export async function POST() {
  const visitorId = getOrCreateVisitorId();
  await kv.set(`wc26:tipseen:${visitorId}`, true);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}
