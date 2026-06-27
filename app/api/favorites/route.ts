// app/api/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const VISITOR_COOKIE = 'wc26_visitor';
const MAX_FAVORITES = 4;
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
  const teamIds = (await kv.get<number[]>(`wc26:favorites:${visitorId}`)) || [];
  const res = NextResponse.json({ teamIds });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}

export async function POST(req: NextRequest) {
  const visitorId = getOrCreateVisitorId();
  const body = await req.json();
  const { teamIds } = body as { teamIds: number[] };

  if (!Array.isArray(teamIds) || teamIds.length > MAX_FAVORITES) {
    return NextResponse.json(
      { error: `Pick up to ${MAX_FAVORITES} favorite teams.` },
      { status: 400 }
    );
  }

  await kv.set(`wc26:favorites:${visitorId}`, teamIds);

  const res = NextResponse.json({ teamIds });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}
