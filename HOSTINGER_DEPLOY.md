# KIS — auto-deploy to Hostinger

Every time a change is pushed to GitHub `main`, GitHub Actions builds the app and uploads it to
your Hostinger space over FTP. You set this up once (add your FTP details as repo secrets); after
that it's automatic.

Repo: **https://github.com/rmoussa988/kitchen-intelligence-system**
The Supabase values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are already stored as repo
secrets — you only need to add the three FTP secrets below.

## 1. Get your FTP details from Hostinger
In **hPanel → Files → FTP Accounts** (create an account if there isn't one). Note:
- **FTP hostname** (e.g. `ftp.yourdomain.com` or an IP)
- **FTP username**
- **FTP password** (the one you set for that FTP account)

Decide where the site should live:
- Main domain → files go in `public_html/` (the default).
- A subdomain (e.g. `kis.yourdomain.com`) → create the subdomain in hPanel first; its folder is
  usually `public_html/kis/` (hPanel shows the exact "document root").

## 2. Add the FTP details as GitHub secrets
On the repo: **Settings → Secrets and variables → Actions → New repository secret**. Add three:

| Secret name    | Value                                   |
|----------------|-----------------------------------------|
| `FTP_SERVER`   | your FTP hostname (from step 1)          |
| `FTP_USERNAME` | your FTP username                        |
| `FTP_PASSWORD` | your FTP password                        |

If the site is NOT in `public_html/`, also add a **variable** (same page → Variables tab → New):
| Variable name    | Value (example)     |
|------------------|---------------------|
| `FTP_TARGET_DIR` | `public_html/kis/`  |

(I never see these — you enter them directly into GitHub.)

## 3. Run the deploy
- **Actions** tab → the **“Build & deploy to Hostinger”** workflow → **Run workflow** (or push any
  change / click **Re-run jobs** on the latest run).
- Watch it go green. Then open your domain — KIS is live.

From now on, whenever I push an update, it redeploys automatically. No dragging, no manual steps.

## Notes
- The workflow uses **FTPS** (secure). If your plan only allows plain FTP, open
  `.github/workflows/deploy.yml`, change `protocol: ftps` to `protocol: ftp`, and push — or tell me
  and I'll change it.
- The app uses hash-based routing, so it needs no `.htaccess`/rewrite rules — dropping the files in
  the web root just works.
- Custom domain / HTTPS are handled in hPanel as usual; the app doesn't care what domain it's on
  (Supabase password login works from any origin).
- First run may fail at the FTP step until the three secrets are added — that's expected; re-run it
  after adding them.
