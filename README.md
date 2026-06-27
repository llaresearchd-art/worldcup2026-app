# Ridwan's World Cup 2026 App

A personal FIFA World Cup 2026 companion app — live scores, predictions, squads, the road to the final, and your favorite teams.

Built by Mohammad Ridwan Rahman · https://www.mridwanrahman.com/

## What's inside

- **Home** — live match cards (score, minute, scorers, stadium), match counter, "Up Next" with countdown + quick prediction
- **Results** — every completed match
- **Schedule** — every upcoming match
- **Squads** — all 48 teams, full rosters (name, position, shirt number — no photos, see note below)
- **Road to Final** — knockout bracket, updates as results come in
- **Top Scorers** — live leaderboard
- **My Prediction** — every prediction you've made, with a running correct/incorrect score
- **My Teams** — pick up to 4 favorites, see just their results and fixtures

## How live data works

This app polls **football-data.org**'s free API (10 requests/minute limit) every ~25 seconds on the server, caches the result in Vercel KV, and your phone polls that cache every ~20 seconds. This means:
- Data is roughly 20-30 seconds behind real life — close enough to feel live, while staying within the free tier no matter how many friends are using it at once.
- No player photos are shown in Squads, because the free data source doesn't provide them.
- The new 2026 knockout format (Round of 32 onward) is handled by stage name, but hasn't been verified against a live tournament yet — if the bracket page looks off once the knockout rounds begin, that's the first thing to check.

## Setup

See **DEPLOY_GUIDE.md** for a full click-by-click deployment walkthrough (no coding needed).

Quick version for anyone comfortable with the terminal:

```bash
npm install
cp .env.example .env.local   # then add your FOOTBALL_DATA_TOKEN
npm run dev
```

You'll also need a Vercel KV (or any Redis-compatible) database connected for predictions/favorites to persist — see DEPLOY_GUIDE.md Part 4b.

## Known limitations (read before relying on this for match day)

1. **Not millisecond-real-time.** ~20-30 second delay by design, to stay free.
2. **No player photos or club affiliations.** The free data source only provides name, position, shirt number, and nationality for national-team squads — there's an honest note about this directly on the Squad page now.
3. **2026 bracket stage names.** Fixed to check both `LAST_32`/`ROUND_OF_32` naming and gracefully display any unrecognized stage name rather than crash — but the exact stage value football-data.org uses for the expanded Round of 32 hasn't been confirmed against live knockout data yet, since the group stage was still underway when this was last checked.
4. **Free database tier limits.** Vercel KV's free tier has generous but finite request limits — fine for personal/friend-group use, not built for viral scale.
5. **Error recovery.** Added error boundaries (`app/error.tsx`, `app/road-to-final/error.tsx`) so an unexpected data shape shows a friendly "Try again / Back to Home" screen instead of a frozen page.
