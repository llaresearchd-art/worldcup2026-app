# Deploying Your World Cup 2026 App — Step by Step

This guide assumes zero coding experience. Just follow the steps in order. Total time: about 15-20 minutes, and everything is free.

---

## Part 1 — Get a free football-data.org API key (2 minutes)

1. Go to **https://www.football-data.org/client/register**
2. Fill in your name and email, submit.
3. Check your email — they'll send you an API token (a long string of letters/numbers). Copy it somewhere safe (like a Notes app). You'll paste it in Part 4.

---

## Part 2 — Put the code on GitHub (5 minutes)

GitHub is just a place to store your code so Vercel (the hosting service) can grab it.

1. Go to **https://github.com** and click **Sign up** (free account) if you don't have one.
2. Once logged in, click the **+** icon top-right → **New repository**.
3. Name it `worldcup2026-app` (or anything you like). Keep it **Public** or **Private**, either is fine. Click **Create repository**.
4. On the new repo page, click **uploading an existing file**.
5. Drag in the entire project folder I gave you (or all files inside it) — GitHub will let you drag a whole folder in modern browsers. If it doesn't accept the folder directly, zip extraction first, then drag the contents in.
6. Scroll down, click **Commit changes**.

---

## Part 3 — Create a free Vercel account and import the project (5 minutes)

1. Go to **https://vercel.com/signup** and choose **Continue with GitHub** — this links your accounts, so Vercel can see your new repo.
2. Once logged in, click **Add New** → **Project**.
3. Find `worldcup2026-app` in the list and click **Import**.
4. Leave all settings as default (Vercel auto-detects Next.js). Don't click Deploy yet — first we need to add two things in Part 4 below, otherwise the app will error out with no data.

---

## Part 4 — Add your API key and database (5 minutes)

Still on that same Vercel import screen (or afterwards, in Project Settings):

### 4a. Add the football-data.org key
1. Expand **Environment Variables**.
2. Name: `FOOTBALL_DATA_TOKEN`
3. Value: paste the token you got by email in Part 1.
4. Click **Add**.

### 4b. Create the free database (this stores your predictions & favorite teams)
1. In your Vercel project, go to the **Storage** tab.
2. Click **Create Database** → choose **KV** (it's free, powered by Upstash Redis).
3. Name it anything, click **Create**, then click **Connect to Project** and select your `worldcup2026-app` project.
4. Vercel automatically adds the two required keys (`KV_REST_API_URL` and `KV_REST_API_TOKEN`) for you — you don't need to type these in.

### 4c. Deploy
1. Go back to the **Deployments** tab (or click **Deploy** if you're still on the import screen).
2. Wait about 1-2 minutes. When it says **Ready**, click **Visit** — that's your live app URL!

---

## Part 5 — Share it with friends

Your app now lives at a URL like `worldcup2026-app.vercel.app`. Copy that link and send it to anyone — they can open it on their own phone, no login needed, and it works independently for each person (their own predictions, their own favorite teams).

---

## A few honest notes

- **Refresh speed**: Live scores update roughly every 20-30 seconds, not instantly. This is intentional — it keeps the app free forever instead of needing a paid plan. It will still feel live while you're watching a match.
- **Squad photos**: The free data source gives names, positions, and shirt numbers, but not player photos. I designed the Squad page around this so it still looks clean.
- **If something looks empty**: Right after deploying, the cache is empty until the first request warms it up — refresh once after 10-15 seconds.
- **If you ever want true 5-second live updates**: That requires a paid data plan (~$19+/month with most providers). The current free setup is a deliberate trade-off you chose, and it's a very reasonable one.

If anything in these steps doesn't match what you see on screen (these services do update their UI sometimes), tell me exactly what you're seeing and I'll help you adjust.
