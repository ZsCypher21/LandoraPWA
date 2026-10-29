# Client preview: push to GitHub and deploy

The prototype is hosted for the clients only, behind a password and out of search engines (ADR 0013).

## 1. Push the code (once, from this folder)

Open a terminal in the `LandoraPWA` folder:

```bash
git init -b main
git add .
git status            # check: no node_modules, .next, .env or apps/web/AGENTS.md listed
git commit -m "Landora design-stage prototype"
git remote add origin https://github.com/ZsCypher21/LandoraPWA.git
git push -u origin main
```

Later updates: `git add . && git commit -m "..." && git push`.

## 2. Deploy on Vercel

1. Go to https://vercel.com/signup and choose **Continue with GitHub** (Hobby plan).
2. Click **Add New… → Project**. Under **Import Git Repository**, click **Install** / **Adjust GitHub App Permissions**, allow `ZsCypher21/LandoraPWA`, then click **Import** next to it.
3. On **Configure Project**:
   - **Root Directory:** click **Edit**, choose `apps/web`, **Continue**.
   - **Framework Preset:** Next.js (detected). Leave build and install commands as default; Vercel uses pnpm from the lockfile.
   - **Environment Variables:** add `PREVIEW_PASSWORD` with a strong password. Optionally add `PREVIEW_USER` (default username is `landora`).
4. Click **Deploy**. Wait for "Congratulations", then open the `*.vercel.app` URL. The browser asks for the username and password.
5. **Settings → Build and Deployment → Node.js Version:** make sure it is 22.x or newer.

Without `PREVIEW_PASSWORD` the site answers "This preview is not configured yet" (503) on purpose.

## 3. Share with the clients

Send Andrew and Atif the URL, the username and the password in separate messages. Remind them it is synthetic data and a mock role switcher.

To change the password: **Settings → Environment Variables**, edit `PREVIEW_PASSWORD`, then **Deployments → ⋯ → Redeploy**.

## What is checked

- Listing photos are public domain, CC0 or CC BY 2.0/3.0/4.0 from Wikimedia Commons (`apps/web/lib/photo-pool.ts`). All allow public use; the CC BY ones need the credit and licence link, which the listing gallery shows.
- All listings, agents, prices and valuations are synthetic; the site banner says so.
