// lib/match-utils.ts
import { Match } from './football-api';

export function isLive(m: Match): boolean {
  return m.status === 'IN_PLAY' || m.status === 'PAUSED';
}

export function isFinished(m: Match): boolean {
  return m.status === 'FINISHED' || m.status === 'AWARDED';
}

export function isUpcoming(m: Match): boolean {
  // Anything that isn't live and isn't finished is treated as "upcoming" - this is
  // intentionally permissive. The alternative (only recognizing 'SCHEDULED'/'TIMED')
  // risks silently hiding fixtures if the API ever uses a status value we didn't
  // anticipate (e.g. a placeholder status for Round of 32 slots not yet confirmed).
  // Better to show a fixture under the wrong-looking label than to drop it entirely.
  return !isLive(m) && !isFinished(m);
}

export function sortByDateAsc(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
}

export function sortByDateDesc(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
}

export function nextMatch(matches: Match[]): Match | null {
  const now = Date.now();
  const upcoming = sortByDateAsc(
    matches.filter(m => {
      if (!isUpcoming(m)) return false;
      // Don't show as "Up Next" if kickoff was more than 2 hours ago —
      // the match is almost certainly over, API just hasn't updated yet.
      const kickoff = new Date(m.utcDate).getTime();
      const elapsed = (now - kickoff) / 60_000;
      return elapsed < 120;
    })
  );
  return upcoming[0] ?? null;
}

export function liveMatches(matches: Match[]): Match[] {
  return matches.filter(isLive);
}

export function finishedMatches(matches: Match[]): Match[] {
  return sortByDateDesc(matches.filter(isFinished));
}

export function scheduledMatches(matches: Match[]): Match[] {
  return sortByDateAsc(matches.filter(isUpcoming));
}

export function matchesPlayedCount(matches: Match[]): number {
  return matches.filter(isFinished).length;
}

export function totalMatchesCount(matches: Match[]): number {
  return matches.length;
}

export function teamDisplayName(team: { shortName: string | null; name: string } | null | undefined): string {
  if (!team) return 'TBD';
  return team.shortName || team.name;
}

// Fixed to Bangladesh time, 12-hour format with AM/PM, regardless of the visitor's
// device settings - this was previously using toLocaleTimeString(undefined, ...),
// which defers to the device's locale and silently produced 24-hour time on many
// phones even with hour:'numeric' set. Explicit timeZone + hour12 removes that
// ambiguity entirely.
const DISPLAY_TIMEZONE = 'Asia/Dhaka';

export function formatKickoff(utcDate: string): { date: string; time: string } {
  const d = new Date(utcDate);
  return {
    date: d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: DISPLAY_TIMEZONE,
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: DISPLAY_TIMEZONE,
    }),
  };
}

export function countdownParts(utcDate: string, now: number): { d: number; h: number; m: number; s: number; passed: boolean } {
  const target = new Date(utcDate).getTime();
  let diff = target - now;
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, passed: true };
  const d = Math.floor(diff / 86_400_000);
  diff -= d * 86_400_000;
  const h = Math.floor(diff / 3_600_000);
  diff -= h * 3_600_000;
  const m = Math.floor(diff / 60_000);
  diff -= m * 60_000;
  const s = Math.floor(diff / 1000);
  return { d, h, m, s, passed: false };
}

// Fallback display when the API hasn't given us an exact minute yet (e.g. right at
// kickoff, or a detail-call hiccup). Rough estimate only - doesn't account for
// stoppage time or halftime breaks, so it's clearly different visual treatment from
// a real, API-confirmed minute.
export function estimatedElapsedMinutes(utcDate: string, now: number): number {
  const kickoff = new Date(utcDate).getTime();
  const elapsedMs = now - kickoff;
  if (elapsedMs < 0) return 0;
  return Math.min(Math.floor(elapsedMs / 60_000), 120);
}
