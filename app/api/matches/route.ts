// app/api/matches/route.ts
import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, updatedAt, stale } = await getMatches();
    return NextResponse.json({ matches: data, updatedAt, stale });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not load matches right now. Please try again shortly.' },
      { status: 502 }
    );
  }
}
