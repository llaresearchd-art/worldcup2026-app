// app/api/debug-matches/route.ts
//
// Temporary diagnostic endpoint. Returns the RAW response from football-data.org
// with zero transformation, so we can see the actual shape of Round of 32 fixtures
// (which stage/group values are really being used, whether homeTeam/awayTeam are
// null for undetermined slots, etc) instead of guessing.
//
// Safe to delete once the Schedule/Road to Final pages are confirmed working -
// it doesn't expose your API key, only match data that's already public.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_TOKEN not set' }, { status: 500 });
  }

  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': token },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Upstream returned ${res.status}`, body },
        { status: 502 }
      );
    }

    const raw = await res.json();

    // Summarize what stages/groups actually appear, plus flag any match with a
    // null team, so the important info is visible at a glance without scrolling
    // through 104 matches by hand.
    const matches = raw.matches ?? [];
    const stageBreakdown: Record<string, number> = {};
    const matchesWithNullTeam: any[] = [];

    for (const m of matches) {
      stageBreakdown[m.stage ?? 'NULL_STAGE'] = (stageBreakdown[m.stage ?? 'NULL_STAGE'] ?? 0) + 1;
      if (!m.homeTeam || !m.awayTeam) {
        matchesWithNullTeam.push({
          id: m.id,
          stage: m.stage,
          group: m.group,
          status: m.status,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          utcDate: m.utcDate,
        });
      }
    }

    return NextResponse.json({
      totalMatches: matches.length,
      stageBreakdown,
      matchesWithNullTeamCount: matchesWithNullTeam.length,
      matchesWithNullTeam,
      // First 3 full raw matches from each non-group stage, for full inspection
      sampleKnockoutMatches: matches
        .filter((m: any) => m.stage && m.stage !== 'GROUP_STAGE')
        .slice(0, 5),
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
