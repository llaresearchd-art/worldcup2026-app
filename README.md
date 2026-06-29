# My World Cup 2026

A personal FIFA World Cup 2026 companion app — live scores, predictions, a leaderboard, squads, the road to the final, push notifications, and your favorite teams.

Built by Mohammad Ridwan Rahman · https://www.mridwanrahman.com/

## What's inside

- **Home** — live match cards (score, minute, scorers, stadium), match counter, "Up Next" with countdown + quick prediction, notification opt-in, leaderboard join
- **Results** — every completed match
- **Schedule** — every upcoming match, grouped by Today / Tomorrow / date
- **Squads** — all 48 teams, full rosters (name, position, shirt number — no photos or club names, see note below)
- **Road to Final** — knockout bracket with match date/time, updates as results come in
- **Top Scorers** — live leaderboard with matches played
- **My Prediction** — every prediction you've made, with a running correct/incorrect score (private to you)
- **Leaderboard** — join with a display name to compete with friends on prediction accuracy (+3 pts for a correct winner pick, +4 for a correct draw call). Names and scores here are **public** to anyone using the app — unlike predictions and favorites, which stay private to each person.
- **My Teams** — pick up to 4 favorites, see just their results and fixtures
- **Push notifications** — match reminders (24h/3h/30min/5min before kickoff), goal alerts, and final results, even with the app closed

## How live data works

This app polls **football-data.org**'s free API (10 requests/minute limit) on the server and caches the result in Upstash Redis (via Vercel's Marketplace), so your phone never calls the upstream API directly. This means:
- Match data is roughly 20-30 seconds behind real life — close enough to feel live, while staying within the free tier no matter how many friends are using it at once.
- Live match **minute** is fetched separately per live match (only while a match is actually live), since football-data.org's list endpoint omits it to save bandwidth.
- No player photos or club names are shown in Squads — the free data source only provides name, position, shirt number, and nationality for national-team squads.

## Push notifications

Uses the standard Web Push API (VAPID), not a native app — works on Android directly in the browser; **iPhone requires "Add to Home Screen" first**, since a plain Safari tab can't receive push on iOS.

Vercel's free tier only runs its own cron jobs once a day, which is too slow for live alerts — so a free external scheduler (cron-job.org) calls `/api/cron/notifications` every 1-5 minutes instead. See **DEPLOY_GUIDE.md Part 6** for full setup.

The notification system has a one-time "baseline" pass and a hard per-run cap (10) specifically to prevent a flood of retroactive notifications on first run — learned the hard way during development.

## Setup

See **DEPLOY_GUIDE.md** for a full click-by-click deployment walkthrough (no coding needed).

Quick version for anyone comfortable with the terminal:

```bash
npm install
cp .env.example .env.local   # then add FOOTBALL_DATA_TOKEN, VAPID keys, Upstash Redis creds
npm run dev
```

You'll need:
- A free football-data.org API token
- An Upstash Redis database connected via Vercel's Storage Marketplace (predictions, favorites, leaderboard, and notification state all persist here)
- VAPID keys for push notifications (generate via `/api/push/generate-keys` after deploying once)
- A free cron-job.org scheduler hitting `/api/cron/notifications`

## Known limitations (read before relying on this for match day)

1. **Not millisecond-real-time.** ~20-30 second delay on scores, ~1-1.5 minutes on notifications, by design, to stay free.
2. **No player photos or club affiliations.** Free data source limitation — would need ~1,250 extra API calls to fetch per-player, not worth it at this scale.
3. **Leaderboard is public.** Anyone with the app link can see every participant's name and score.
4. **Free database/scheduler tier limits.** Fine for personal/friend-group use, not built for viral scale.
5. **Error recovery.** Error boundaries (`app/error.tsx`, `app/road-to-final/error.tsx`) show a friendly "Try again / Back to Home" screen instead of a frozen page if something unexpected happens.
