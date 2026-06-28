// app/api/cron/notifications/route.ts
//
// This route is called automatically on a schedule by Vercel Cron (configured in
// vercel.json). Each run, it:
//   1. Gets the current match list (from our existing cache - no extra API cost)
//   2. For each upcoming match, checks if it's time for one of the 3 reminders or
//      the 5-minute warning, and sends a notification if so (once each, tracked in
//      Redis so we never send the same reminder twice)
//   3. For each live match, checks for new goals since last run and notifies
//   4. For each match that just finished, sends a final result notification once
//
// Reminder timing (3 reminders before kickoff): 24 hours, 3 hours, and 30 minutes
// before. Plus a separate 5-minute warning as requested.
import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/cache';
import { getRedis } from '@/lib/redis';
import { broadcastNotification } from '@/lib/push';
import { teamDisplayName, isFinished } from '@/lib/match-utils';
import { Match } from '@/lib/football-api';

const kv = getRedis();

// Tracks which notifications have already been sent for which match, so re-running
// this job every few minutes never double-sends. Key per match+notification-type.
async function alreadySent(matchId: number, kind: string): Promise<boolean> {
  const key = `wc26:notified:${matchId}:${kind}`;
  const existing = await kv.get(key);
  return existing !== null;
}

async function markSent(matchId: number, kind: string) {
  const key = `wc26:notified:${matchId}:${kind}`;
  // 7 day expiry - plenty long for any single match, keeps the DB tidy afterwards.
  await kv.set(key, true, { ex: 60 * 60 * 24 * 7 });
}

async function trackedGoalCount(matchId: number): Promise<number> {
  const key = `wc26:goalcount:${matchId}`;
  const existing = await kv.get<number>(key);
  return existing ?? 0;
}

async function setTrackedGoalCount(matchId: number, count: number) {
  const key = `wc26:goalcount:${matchId}`;
  await kv.set(key, count, { ex: 60 * 60 * 24 * 7 });
}

function matchupLabel(m: Match): string {
  return `${teamDisplayName(m.homeTeam)} vs ${teamDisplayName(m.awayTeam)}`;
}

// Authorization check so this endpoint can't be spammed/triggered by randoms hitting
// the URL - Vercel Cron sends this header automatically, no setup needed from you.
function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // if not configured, allow (simplifies initial setup)
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    const { data: matches } = await getMatches();
    const now = Date.now();

    for (const m of matches) {
      if (!m || m.id == null || !m.utcDate) continue;
      const kickoff = new Date(m.utcDate).getTime();
      const minutesToKickoff = (kickoff - now) / 60_000;

      // --- Reminders before kickoff (24h, 3h, 30min) ---
      const reminderWindows: { kind: string; minutes: number; label: string }[] = [
        { kind: 'reminder_24h', minutes: 24 * 60, label: 'tomorrow' },
        { kind: 'reminder_3h', minutes: 3 * 60, label: 'in 3 hours' },
        { kind: 'reminder_30m', minutes: 30, label: 'in 30 minutes' },
      ];

      for (const window of reminderWindows) {
        // Fire once minutesToKickoff drops to or below the window, but only if
        // we're still reasonably close to it (within a 15-minute grace period) -
        // this avoids firing every single past window if the cron job was paused
        // for a while and catches up later.
        if (minutesToKickoff <= window.minutes && minutesToKickoff > window.minutes - 15) {
          if (!(await alreadySent(m.id, window.kind))) {
            await broadcastNotification({
              title: 'Upcoming Match',
              body: `${matchupLabel(m)} kicks off ${window.label}${m.venue ? ` at ${m.venue}` : ''}.`,
              url: '/',
              tag: `match-${m.id}-${window.kind}`,
            });
            await markSent(m.id, window.kind);
            results.push(`Sent ${window.kind} for match ${m.id}`);
          }
        }
      }

      // --- 5-minute warning ---
      if (minutesToKickoff <= 5 && minutesToKickoff > -10) {
        if (!(await alreadySent(m.id, 'reminder_5m'))) {
          await broadcastNotification({
            title: 'Kicking off soon!',
            body: `${matchupLabel(m)} starts in 5 minutes${m.venue ? ` at ${m.venue}` : ''}.`,
            url: '/',
            tag: `match-${m.id}-reminder_5m`,
          });
          await markSent(m.id, 'reminder_5m');
          results.push(`Sent 5-min warning for match ${m.id}`);
        }
      }

      // --- Goal notifications (live matches only) ---
      if (m.status === 'IN_PLAY' || m.status === 'PAUSED') {
        const goals = m.goals ?? [];
        const previousCount = await trackedGoalCount(m.id);
        if (goals.length > previousCount) {
          const newGoals = goals.slice(previousCount);
          for (const g of newGoals) {
            const scoringTeam =
              m.homeTeam && g.team.id === m.homeTeam.id
                ? m.homeTeam
                : m.awayTeam && g.team.id === m.awayTeam.id
                ? m.awayTeam
                : null;
            await broadcastNotification({
              title: '⚽ Goal!',
              body: `${g.scorer.name} scores for ${scoringTeam ? teamDisplayName(scoringTeam) : 'a team'} (${
                g.minute ?? '?'
              }') — ${matchupLabel(m)}`,
              url: '/',
              tag: `match-${m.id}-goal-${previousCount + newGoals.indexOf(g) + 1}`,
            });
          }
          await setTrackedGoalCount(m.id, goals.length);
          results.push(`Sent ${newGoals.length} goal notification(s) for match ${m.id}`);
        }
      }

      // --- Final result notification ---
      if (isFinished(m)) {
        if (!(await alreadySent(m.id, 'final_result'))) {
          const home = m.score?.fullTime?.home ?? 0;
          const away = m.score?.fullTime?.away ?? 0;
          await broadcastNotification({
            title: 'Full Time',
            body: `${matchupLabel(m)} ended ${home}-${away}.`,
            url: '/result',
            tag: `match-${m.id}-final_result`,
          });
          await markSent(m.id, 'final_result');
          results.push(`Sent final result for match ${m.id}`);
        }
      }
    }

    return NextResponse.json({ ok: true, actions: results });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
