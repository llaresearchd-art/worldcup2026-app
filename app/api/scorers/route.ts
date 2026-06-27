// app/api/scorers/route.ts
import { NextResponse } from 'next/server';
import { getTopScorers } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, updatedAt, stale } = await getTopScorers();
    return NextResponse.json({ scorers: data, updatedAt, stale });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not load top scorers right now. Please try again shortly.' },
      { status: 502 }
    );
  }
}
