// lib/football-api.ts
// Thin client for football-data.org v4, scoped to the FIFA World Cup (code: WC).
// Free tier: 10 requests/minute. We stay well under that by caching in lib/cache.ts
// and only refreshing every REFRESH_INTERVAL_MS (see lib/cache.ts).

const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION = 'WC';

export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'POSTPONED'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'AWARDED';

export interface TeamRef {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

export interface Scorer {
  minute: number | null;
  team: { id: number };
  scorer: { id: number; name: string };
  assist?: { id: number; name: string } | null;
  type?: string;
}

export interface Match {
  id: number;
  utcDate: string;
  status: MatchStatus;
  minute?: number | null;
  stage: string;
  group: string | null;
  venue?: string | null;
  homeTeam: TeamRef | null;
  awayTeam: TeamRef | null;
  score: {
    winner: string | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  goals?: Scorer[];
}

export interface ScorerEntry {
  player: { id: number; name: string; nationality: string };
  team: TeamRef;
  goals: number;
  assists: number | null;
  penalties: number | null;
  playedMatches: number | null;
}

export interface SquadPlayer {
  id: number;
  name: string;
  position: string;
  dateOfBirth: string;
  nationality: string;
  shirtNumber: number | null;
}

export interface TeamFull extends TeamRef {
  area: { name: string; flag: string | null };
  venue: string | null;
  squad: SquadPlayer[];
}

function getToken(): string {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    throw new Error(
      'FOOTBALL_DATA_TOKEN is missing. Add it in your Vercel project environment variables.'
    );
  }
  return token;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': getToken() },
    // Next.js server-side fetch cache; our own lib/cache.ts adds a second layer
    // tuned for the 10 req/min free-tier limit.
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`football-data.org ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAllMatches(): Promise<Match[]> {
  const data = await apiFetch<{ matches: Match[] }>(`/competitions/${COMPETITION}/matches`);
  return data.matches;
}

export async function fetchMatchDetail(id: number): Promise<Match> {
  // The list endpoint omits "deep" fields like live minute to save bandwidth
  // (confirmed in football-data.org's v4 docs). The single-match endpoint includes
  // them, so we call this only for matches that are currently live.
  return apiFetch<Match>(`/matches/${id}`);
}

export async function fetchTopScorers(): Promise<ScorerEntry[]> {
  const data = await apiFetch<{ scorers: ScorerEntry[] }>(
    `/competitions/${COMPETITION}/scorers?limit=20`
  );
  return data.scorers;
}

export async function fetchTeams(): Promise<TeamFull[]> {
  const data = await apiFetch<{ teams: TeamFull[] }>(`/competitions/${COMPETITION}/teams`);
  return data.teams;
}

export function flagUrlForTeam(team: { crest: string | null }): string | null {
  return team.crest;
}
