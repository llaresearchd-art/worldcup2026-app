// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getRedis } from '@/lib/redis';

const VISITOR_COOKIE = 'wc26_visitor';
const kv = getRedis();
const MAX_NAME_LENGTH = 24;

function getOrCreateVisitorId(): string {
  const store = cookies();
  let id = store.get(VISITOR_COOKIE)?.value;
  if (!id) {
    id = randomUUID();
  }
  return id;
}

function sanitizeName(raw: string): string {
  // Strip anything that isn't a normal display-name character, trim, cap length.
  // Keeps the leaderboard readable and prevents anyone pasting in something huge
  // or full of control characters.
  return raw
    .replace(/[^\p{L}\p{N}\s\-_.']/gu, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export async function GET() {
  const visitorId = getOrCreateVisitorId();
  const name = await kv.get<string>(`wc26:name:${visitorId}`);
  const res = NextResponse.json({ name: name || null });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}

export async function POST(req: NextRequest) {
  const visitorId = getOrCreateVisitorId();
  const body = await req.json();
  const rawName = typeof body?.name === 'string' ? body.name : '';
  const name = sanitizeName(rawName);

  if (!name) {
    return NextResponse.json({ error: 'Please enter a name.' }, { status: 400 });
  }

  await kv.set(`wc26:name:${visitorId}`, name);
  await kv.sadd('wc26:leaderboard:participants', visitorId);

  const res = NextResponse.json({ name });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}
