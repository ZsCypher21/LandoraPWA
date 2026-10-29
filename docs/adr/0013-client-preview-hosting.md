# 0013. Host the design-stage prototype on Vercel behind a password for client review

- **Status:** Proposed
- **Date:** 2026-10-29
- **Deciders:** Prasana (project lead, interim approver); then Product Owner (Andrew / Atif)
- **Related:** ADR 0002 (PWA on Next.js), ADR 0010 (cloud and infrastructure as code), ADR 0011 (mock role switcher)

## Context

The clients want to click through the prototype without running it locally. The prototype uses synthetic data, an in-memory mock store and a mock "Viewing as" role switcher (ADR 0011), so it must not be public or indexed. ADR 0010 covers production hosting for the MVP build and is not changed here.

## Decision

1. Host `apps/web` on Vercel (Hobby, free), connected to the GitHub repo, root directory `apps/web`, pnpm from the root lockfile. Every push to `main` redeploys.
2. Gate every page with HTTP Basic auth in `apps/web/proxy.ts`, using the `PREVIEW_PASSWORD` environment variable. On Vercel a missing password fails closed (503). Local runs without the variable are not gated.
3. Keep crawlers out three ways: `robots.txt` disallows all, every page sets `noindex, nofollow` metadata, and every response carries `X-Robots-Tag: noindex, nofollow, noarchive`.
4. This is a review environment only. It is not the MVP production environment, holds no real personal data, and is retired or replaced when ADR 0010's environments exist.

## Consequences

- Free and about 15 minutes to set up. No new infrastructure in the repo beyond one proxy file.
- Basic auth is one shared password, not per-user access. Fine for synthetic data; rotate it by changing the variable and redeploying.
- The mock store lives in server memory, so changes made in the preview (role actions, moderation) can reset between requests or deployments.
- Vercel Hobby is for non-commercial use. If the client engagement counts as commercial, move the project to Vercel Pro (about US$20/month) or another host; the code does not change.

## Alternatives considered

- **Vercel deployment protection (Vercel Authentication):** clients would need Vercel accounts with access to the project, and on Hobby it does not protect every production URL. Password protection is a paid add-on.
- **Cloudflare Pages, Netlify, a container on the ADR 0010 cloud:** workable, but more setup for Next.js 16 server features than Vercel, for no gain at this stage.
- **Screenshots and a recorded walkthrough only:** already in `docs/ux/screens`; no hands-on clicking.
