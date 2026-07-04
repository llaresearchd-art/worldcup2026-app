// app/api/game-score/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getRedis } from '@/lib/redis';

const VISITOR_COOKIE = 'wc26_visitor';
const kv = getRedis();
const VALID_GAMES = ['penalty', 'keepie-uppie', 'freekick'];

function getOrCreateVisitorId(): string {
  const store = cookies();
  let id = store.get(VISITOR_COOKIE)?.value;
  if (!id) id = randomUUID();
  return id;
}

// GET /api/game-score?game=penalty — returns top 10 + current visitor's best
export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get('game');
  if (!game || !VALID_GAMES.includes(game)) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
  }

  const visitorId = getOrCreateVisitorId();

  // Top 10 from sorted set (highest score first)
  const top10Raw = await kv.zrange(`wc26:game:${game}:scores`, 0, 9, { rev: true, withScores: true });

  const leaderboard: { name: string; score: number }[] = [];
  for (let i = 0; i < top10Raw.length; i += 2) {
    const memberId = top10Raw[i] as string;
    const score = Number(top10Raw[i + 1]);
    const name = await kv.get<string>(`wc26:name:${memberId}`) || 'Anonymous';
    leaderboard.push({ name, score });
  }

  // Current visitor's personal best
  const myScore = await kv.zscore(`wc26:game:${game}:scores`, visitorId);

  const res = NextResponse.json({ leaderboard, myBest: myScore ? Number(myScore) : 0 });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}

// POST /api/game-score — submits a score, only updates if it's a new personal best
export async function POST(req: NextRequest) {
  const visitorId = getOrCreateVisitorId();
  const body = await req.json();
  const { game, score } = body as { game: string; score: number };

  if (!game || !VALID_GAMES.includes(game) || typeof score !== 'number' || score < 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Cap score to prevent cheating via API abuse
  const MAX_SCORES: Record<string, number> = {
    penalty: 10,
    'keepie-uppie': 9999,
    freekick: 15,
  };
  const cappedScore = Math.min(Math.round(score), MAX_SCORES[game] ?? 9999);

  // Only update if this is a new personal best (zadd NX GT would work, using manual check)
  const existing = await kv.zscore(`wc26:game:${game}:scores`, visitorId);
  if (existing === null || cappedScore > Number(existing)) {
    await kv.zadd(`wc26:game:${game}:scores`, { score: cappedScore, member: visitorId });
  }

  const res = NextResponse.json({ ok: true, score: cappedScore });
  res.cookies.set(VISITOR_COOKIE, visitorId, { maxAge: 60 * 60 * 24 * 120, path: '/' });
  return res;
}
