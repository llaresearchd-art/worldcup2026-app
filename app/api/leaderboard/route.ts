// app/api/leaderboard/route.ts
//
// Computes everyone's prediction score by comparing each named participant's saved
// picks against actual match results. Scoring: +3 for correctly picking the winner
// (home/away), +4 total for correctly calling a draw (the +3 base, plus a +1 bonus
// since draws are harder to call correctly).
import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { getMatches } from '@/lib/cache';
import { isFinished } from '@/lib/match-utils';
import { Match } from '@/lib/football-api';

const kv = getRedis();

function actualResult(m: Match): 'HOME' | 'AWAY' | 'DRAW' | null {
  if (!isFinished(m)) return null;
  const h = m.score?.fullTime?.home ?? 0;
  const a = m.score?.fullTime?.away ?? 0;
  if (h > a) return 'HOME';
  if (a > h) return 'AWAY';
  return 'DRAW';
}

function pointsFor(pick: string, actual: 'HOME' | 'AWAY' | 'DRAW'): number {
  if (pick !== actual) return 0;
  return actual === 'DRAW' ? 4 : 3; // +3 base, +1 extra baked in for a correct draw call
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [{ data: matches }, participantIds] = await Promise.all([
      getMatches(),
      kv.smembers('wc26:leaderboard:participants') as Promise<string[]>,
    ]);

    const finishedById = new Map<string, 'HOME' | 'AWAY' | 'DRAW'>();
    for (const m of matches) {
      const result = actualResult(m);
      if (result) finishedById.set(String(m.id), result);
    }

    const rows = await Promise.all(
      (participantIds || []).map(async (visitorId) => {
        const [name, predictions] = await Promise.all([
          kv.get<string>(`wc26:name:${visitorId}`),
          kv.get<Record<string, string>>(`wc26:predictions:${visitorId}`),
        ]);

        if (!name) return null; // shouldn't happen, but guard anyway

        let points = 0;
        let correct = 0;
        let settled = 0;

        if (predictions) {
          const entries = Object.entries(predictions) as [string, string][];
          for (const [matchId, pick] of entries) {
            const actual = finishedById.get(matchId);
            if (!actual) continue; // match hasn't finished yet, doesn't count either way
            settled += 1;
            const earned = pointsFor(pick, actual);
            points += earned;
            if (earned > 0) correct += 1;
          }
        }

        return { name, points, correct, settled };
      })
    );

    const leaderboard = rows
      .filter((r): r is { name: string; points: number; correct: number; settled: number } => r !== null)
      .sort((a, b) => b.points - a.points || b.correct - a.correct);

    return NextResponse.json({ leaderboard });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
