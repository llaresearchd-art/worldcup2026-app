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

const BASELINE_KEY = 'wc26:notifications:baseline_done';

// On the very first run ever, there could be dozens of already-finished matches and
// already-passed reminder windows with nothing marked as "sent" yet (since the
// tracking only just started existing). Without this guard, the very first run would
// fire a notification for every single one of those past events at once - a flood,
// not a bug in any individual match's logic. This function runs once, marks
// everything that's already in the past as "already handled" without notifying
// anyone, and only allows real notifications for things that happen FROM THIS POINT
// FORWARD.
async function ensureBaseline(matches: Match[], now: number) {
  const baselineAlreadyRun = await kv.get(BASELINE_KEY);
  if (baselineAlreadyRun) return;

  for (const m of matches) {
    if (!m || m.id == null || !m.utcDate) continue;
    const kickoff = new Date(m.utcDate).getTime();
    const minutesToKickoff = (kickoff - now) / 60_000;

    // Mark any reminder window that has already passed as sent, so it won't fire
    // retroactively.
    if (minutesToKickoff <= 24 * 60) await markSent(m.id, 'reminder_24h');
    if (minutesToKickoff <= 3 * 60) await markSent(m.id, 'reminder_3h');
    if (minutesToKickoff <= 30) await markSent(m.id, 'reminder_30m');
    if (minutesToKickoff <= 5) await markSent(m.id, 'reminder_5m');

    // Mark already-finished matches as already notified, and baseline their current
    // goal count so only NEW goals (from this point on) ever trigger a notification.
    if (isFinished(m)) {
      await markSent(m.id, 'final_result');
    }
    const currentGoalCount = (m.goals ?? []).length;
    if (currentGoalCount > 0) {
      await setTrackedGoalCount(m.id, currentGoalCount);
    }
  }

  await kv.set(BASELINE_KEY, true);
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];
  const MAX_NOTIFICATIONS_PER_RUN = 10; // safety cap: even if something is wrong with
  // the logic above, this guarantees a single run can never flood anyone the way the
  // very first un-baselined run did. Real usage should never need more than 1-3 per
  // run (one reminder, maybe a couple of simultaneous goals).
  let sentThisRun = 0;

  try {
    const { data: matches } = await getMatches();
    const now = Date.now();

    await ensureBaseline(matches, now);

    for (const m of matches) {
      if (sentThisRun >= MAX_NOTIFICATIONS_PER_RUN) {
        results.push('Safety cap reached for this run - stopping early.');
        break;
      }
      if (!m || m.id == null || !m.utcDate) continue;
      const kickoff = new Date(m.utcDate).getTime();
      const minutesToKickoff = (kickoff - now) / 60_000;

      // --- Reminders before kickoff (24h, 3h, 30min) ---
      // Hard guard: never send a "match starting" reminder for a match that has
      // already kicked off or finished, no matter what the time-window math says.
      // This protects against the cron job missing a run for an extended stretch
      // (scheduler downtime, a paused job, etc) and then catching up later with
      // stale timing math that would otherwise still satisfy a window check.
      const alreadyUnderway = m.status !== 'SCHEDULED' && m.status !== 'TIMED';

      const reminderWindows: { kind: string; minutes: number; label: string }[] = alreadyUnderway
        ? []
        : [
            { kind: 'reminder_24h', minutes: 24 * 60, label: 'tomorrow' },
            { kind: 'reminder_3h', minutes: 3 * 60, label: 'in 3 hours' },
            { kind: 'reminder_30m', minutes: 30, label: 'in 30 minutes' },
          ];

      for (const window of reminderWindows) {
        if (sentThisRun >= MAX_NOTIFICATIONS_PER_RUN) break;
        // Fire once minutesToKickoff drops to or below the window, but only if
        // we're still reasonably close to it (within a 15-minute grace period) -
        // this avoids firing every single past window if the cron job was paused
        // for a while and catches up later.
        if (minutesToKickoff <= window.minutes && minutesToKickoff > window.minutes - 15) {
          if (!(await alreadySent(m.id, window.kind))) {
            const isPredictionWindow = window.kind === 'reminder_30m';
            const homeLabel = teamDisplayName(m.homeTeam);
            const awayLabel = teamDisplayName(m.awayTeam);

            await broadcastNotification({
              title: isPredictionWindow ? 'Who do you think wins?' : 'Upcoming Match',
              body: `${matchupLabel(m)} kicks off ${window.label}${m.venue ? ` at ${m.venue}` : ''}.${
                isPredictionWindow ? ' Tap a team to predict, or open the app for all options.' : ''
              }`,
              url: '/',
              tag: `match-${m.id}-${window.kind}`,
              matchId: isPredictionWindow ? String(m.id) : undefined,
              // Browsers commonly cap notifications at 2 action buttons, so only the
              // 2 teams get a direct one-tap pick here - draw is always available by
              // opening the app, alongside the team buttons too, so no option is
              // ever truly unreachable.
              actions: isPredictionWindow
                ? [
                    { action: 'predict:HOME', title: homeLabel.slice(0, 18) },
                    { action: 'predict:AWAY', title: awayLabel.slice(0, 18) },
                  ]
                : undefined,
            });
            await markSent(m.id, window.kind);
            results.push(
              `Sent ${window.kind} for match ${m.id} (${matchupLabel(m)}) - kickoff=${m.utcDate}, status=${m.status}, minutesToKickoff=${minutesToKickoff.toFixed(1)}`
            );
            sentThisRun += 1;
          }
        }
      }

      // --- 5-minute warning ---
      if (
        !alreadyUnderway &&
        sentThisRun < MAX_NOTIFICATIONS_PER_RUN &&
        minutesToKickoff <= 5 &&
        minutesToKickoff > -10
      ) {
        if (!(await alreadySent(m.id, 'reminder_5m'))) {
          await broadcastNotification({
            title: 'Kicking off soon!',
            body: `${matchupLabel(m)} starts in 5 minutes${m.venue ? ` at ${m.venue}` : ''}.`,
            url: '/',
            tag: `match-${m.id}-reminder_5m`,
          });
          await markSent(m.id, 'reminder_5m');
          results.push(`Sent 5-min warning for match ${m.id}`);
          sentThisRun += 1;
        }
      }

// --- Goal notifications (live matches only) ---
      // We detect goals by tracking score changes rather than relying on the goals
      // array, because football-data.org's free tier only reliably populates the
      // goals array AFTER a match finishes, not live during play. Score changes
      // are always reflected live. We still use the goals array for scorer names
      // when available, falling back to "a goal was scored" when it isn't.
      if (sentThisRun < MAX_NOTIFICATIONS_PER_RUN && (m.status === 'IN_PLAY' || m.status === 'PAUSED')) {
        const currentScore = (m.score?.fullTime?.home ?? 0) + (m.score?.fullTime?.away ?? 0);
        const previousCount = await trackedGoalCount(m.id);

        if (currentScore > previousCount) {
          const newGoalCount = currentScore - previousCount;

          // Try to get scorer name from goals array if available
          const goals = m.goals ?? [];
          const latestGoal = goals.length > 0 ? goals[goals.length - 1] : null;
          const scoringTeam = latestGoal
            ? (m.homeTeam && latestGoal.team.id === m.homeTeam.id ? m.homeTeam
               : m.awayTeam && latestGoal.team.id === m.awayTeam.id ? m.awayTeam
               : null)
            : null;

          // Build the notification body
          const homeScore = m.score?.fullTime?.home ?? 0;
          const awayScore = m.score?.fullTime?.away ?? 0;
          const scoreStr = `${homeScore}-${awayScore}`;

          let body: string;
          if (latestGoal?.scorer?.name && scoringTeam) {
            body = `${latestGoal.scorer.name} scores for ${teamDisplayName(scoringTeam)}! ${matchupLabel(m)} now ${scoreStr}${latestGoal.minute ? ` (${latestGoal.minute}')` : ''}`;
          } else {
            body = `GOAL! ${matchupLabel(m)} now ${scoreStr}`;
          }

          for (let i = 0; i < Math.min(newGoalCount, MAX_NOTIFICATIONS_PER_RUN - sentThisRun); i++) {
            await broadcastNotification({
              title: '⚽ GOAL!',
              body,
              url: '/',
              tag: `match-${m.id}-goal-score-${currentScore}`,
            });
            sentThisRun += 1;
          }

          await setTrackedGoalCount(m.id, currentScore);
          results.push(`Sent goal notification(s) for match ${m.id} - score now ${scoreStr}`);
        }
      }

      // --- Final result notification ---
      if (sentThisRun < MAX_NOTIFICATIONS_PER_RUN && isFinished(m)) {
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
          sentThisRun += 1;
        }
      }
    }

    return NextResponse.json({ ok: true, actions: results });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
