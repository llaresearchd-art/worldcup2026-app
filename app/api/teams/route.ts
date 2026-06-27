// app/api/teams/route.ts
import { NextResponse } from 'next/server';
import { getTeams } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, updatedAt, stale } = await getTeams();
    return NextResponse.json({ teams: data, updatedAt, stale });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not load teams right now. Please try again shortly.' },
      { status: 502 }
    );
  }
}
