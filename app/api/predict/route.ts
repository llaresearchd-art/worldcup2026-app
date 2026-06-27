// app/api/predict/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const VISITOR_COOKIE = 'wc26_visitor';

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
  const predictions = (await kv.get<Record<string, string>>(`wc26:predictions:${visitorId}`)) || {};
  const res = NextResponse.json({ predictions });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}

export async function POST(req: NextRequest) {
  const visitorId = getOrCreateVisitorId();
  const body = await req.json();
  const { matchId, pick } = body as { matchId: string; pick: 'HOME' | 'DRAW' | 'AWAY' };

  if (!matchId || !pick) {
    return NextResponse.json({ error: 'matchId and pick are required' }, { status: 400 });
  }

  const key = `wc26:predictions:${visitorId}`;
  const existing = (await kv.get<Record<string, string>>(key)) || {};
  existing[matchId] = pick;
  await kv.set(key, existing);

  const res = NextResponse.json({ predictions: existing });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}
