// lib/cache.ts
//
// Why this file exists:
// football-data.org's free tier allows 10 requests/minute. If every visitor's phone
// called the upstream API directly every few seconds, we'd blow through that limit
// almost instantly with more than one person watching.
//
// Instead: this module is the ONLY thing that calls football-data.org. It fetches
// at most once every REFRESH_INTERVAL_MS and stores the result in Vercel KV (a free,
// small Redis-compatible store). Every visitor's browser polls OUR /api/matches route
// every FRONTEND_POLL_MS, which just reads the cache - that's free and unlimited,
// no matter how many friends are watching at once.
//
// Net effect: data is at most ~25 seconds old, but feels live, and we never get close
// to the upstream rate limit even with a big group watching together.

import { getRedis } from './redis';
import {
  fetchAllMatches,
  fetchTeams,
  fetchTopScorers,
  fetchMatchDetail,
  Match,
  TeamFull,
  ScorerEntry,
} from './football-api';

const kv = getRedis();

export const REFRESH_INTERVAL_MS = 25_000; // how often we hit football-data.org for the match list
export const LIVE_DETAIL_INTERVAL_MS = 25_000; // how often we hit per-match detail for live games only
export const FRONTEND_POLL_MS = 20_000; // how often the browser polls OUR cache

const MATCHES_KEY = 'wc26:matches';
const MATCHES_TS_KEY = 'wc26:matches:ts';
const TEAMS_KEY = 'wc26:teams';
const TEAMS_TS_KEY = 'wc26:teams:ts';
const SCORERS_KEY = 'wc26:scorers';
const SCORERS_TS_KEY = 'wc26:scorers:ts';
const LIVE_DETAIL_PREFIX = 'wc26:livedetail:';
const LIVE_DETAIL_TS_PREFIX = 'wc26:livedetail:ts:';

async function getCached<T>(
  dataKey: string,
  tsKey: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<{ data: T; updatedAt: number; stale: boolean }> {
  const [cachedData, cachedTs] = await Promise.all([
    kv.get<T>(dataKey),
    kv.get<number>(tsKey),
  ]);

  const age = cachedTs ? Date.now() - cachedTs : Infinity;

  if (cachedData && age < ttlMs) {
    return { data: cachedData, updatedAt: cachedTs!, stale: false };
  }

  try {
    const fresh = await fetcher();
    const now = Date.now();
    await Promise.all([kv.set(dataKey, fresh), kv.set(tsKey, now)]);
    return { data: fresh, updatedAt: now, stale: false };
  } catch (err) {
    // Upstream failed (rate limit, network blip, etc). Serve what we have, even if
    // stale, rather than showing an error to everyone watching a live match.
    if (cachedData) {
      return { data: cachedData, updatedAt: cachedTs ?? 0, stale: true };
    }
    throw err;
  }
}

export function getTeams() {
  // Squads/teams change rarely - cache much longer (1 hour) to save requests.
  return getCached<TeamFull[]>(TEAMS_KEY, TEAMS_TS_KEY, 60 * 60_000, fetchTeams);
}

export function getTopScorers() {
  return getCached<ScorerEntry[]>(SCORERS_KEY, SCORERS_TS_KEY, REFRESH_INTERVAL_MS, fetchTopScorers);
}

// The match LIST endpoint omits "deep" fields (like live minute) to save bandwidth -
// confirmed in football-data.org's own v4 docs. Only the single-match detail endpoint
// includes them. So for matches that are currently live, we fetch their detail
// separately (each with its own short cache) and merge the minute back in.
// This keeps total request volume low: most of the time zero or one match is live,
// so this adds at most a couple of extra calls per refresh cycle - well inside the
// free 10 req/min limit.
async function enrichLiveMinutes(matches: Match[]): Promise<Match[]> {
  const liveMatches = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED');
  if (liveMatches.length === 0) return matches;

  const detailResults = await Promise.all(
    liveMatches.map(async (m) => {
      const dataKey = `${LIVE_DETAIL_PREFIX}${m.id}`;
      const tsKey = `${LIVE_DETAIL_TS_PREFIX}${m.id}`;
      try {
        const { data } = await getCached<Match>(dataKey, tsKey, LIVE_DETAIL_INTERVAL_MS, () =>
          fetchMatchDetail(m.id)
        );
        return data;
      } catch {
        // If the detail call fails for this one match (rate limit, etc), just keep
        // showing the list version without a minute, rather than breaking the page.
        return null;
      }
    })
  );

  const detailById = new Map(detailResults.filter((d): d is Match => d !== null).map((d) => [d.id, d]));

  return matches.map((m) => {
    const detail = detailById.get(m.id);
    return detail ? { ...m, minute: detail.minute, goals: detail.goals ?? m.goals } : m;
  });
}

export async function getMatches() {
  const result = await getCached<Match[]>(MATCHES_KEY, MATCHES_TS_KEY, REFRESH_INTERVAL_MS, fetchAllMatches);
  const enriched = await enrichLiveMinutes(result.data);
  return { ...result, data: enriched };
}
