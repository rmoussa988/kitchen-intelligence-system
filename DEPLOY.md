# KIS — Deploy to a public URL

Puts the app on the internet so Main Kitchen, Rock, and Kaddoum reach it from any device
instead of `localhost`. The app is a static site (Vite + HashRouter), so hosting is trivial —
no server, no routing config. Your Supabase URL + anon key are already baked into the build
(the anon key is public by design, safe to ship).

## Before you deploy — activate ID safety (30 seconds)
Run the new migration so multi-device IDs can't collide:
- Supabase → **SQL Editor** → **+ New query** → paste the contents of
  **`supabase/migrations/0005_reserve_ids.sql`** → **Run**. (It's a `create or replace function`,
  so it's safe and repeatable — don't re-run the other migrations.)

Until this is run the app still works; it just uses fallback random IDs. After it's run, every
device reserves its own block of IDs from the server.

## Option A — Netlify Drop (fastest, no account setup, ~2 min)
1. I've built the site to the **`dist/`** folder (Finder should be open on it).
2. Go to **[app.netlify.com/drop](https://app.netlify.com/drop)**.
3. **Drag the whole `dist` folder** onto the page.
4. You get a live URL like `https://random-name.netlify.app` — open it, log in, done.
5. (Optional) Sign in to Netlify to claim the site and give it a nicer name.

To publish an update later: rebuild and drag again.
```bash
cd /Users/apple/Desktop/KIS/app && npm run build
```

## Option B — Vercel or Netlify via Git (best for ongoing updates)
Auto-deploys every time the code changes. Needs a GitHub repo (I can set that up on request).
- Push the `app/` folder to a GitHub repo.
- Import it at **vercel.com/new** (or netlify.com) → it auto-detects Vite.
- In the host's **Environment Variables**, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  (same two values as `.env.local`), then deploy.

## After it's live
- **Password login works from any domain** with the anon key — no Supabase allow-list needed.
- If you later enable email confirmations or password resets, set **Supabase → Authentication →
  URL Configuration → Site URL** to your deployed URL so the links point at the right place.
- Add your staff: **Supabase → Authentication → Add user** (one per person), then link each to a
  profile with the `LINK_MY_LOGIN.sql` pattern (swap `U-01` for their profile id, e.g. `U-03`).

## Updating the app
Because the build is static, an update is just: `npm run build` → redeploy (drag `dist/` again,
or push to Git if you set up Option B).
