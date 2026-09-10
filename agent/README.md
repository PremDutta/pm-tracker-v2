# Job scanning agent

Two scheduled GitHub Actions jobs, both free and unlimited on this public repo, both alerting via the same Telegram bot (shared sending logic lives in `notify.mjs`):

- **`scan-jobs.mjs`** (every 6 hours) — watches for new postings.
- **`check-links.mjs`** (weekly, Mondays) — watches for platform links going dead. See "Weekly link health-check" below.

## Job scanning (`scan-jobs.mjs`)

Pings you on Telegram only when something new shows up. No server, no cost, no scraping. Two kinds of sources, both legal:

1. **Adzuna + JSearch** — general aggregators, searches "Product Manager" broadly across India.
2. **Direct ATS feeds** (Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee) for the specific companies you list in `agent/companies.json`. This is the same technique TrueUp's core data layer uses — these APIs are public and unauthenticated *because companies deliberately expose them* to be embedded on their own careers pages, unlike LinkedIn/Naukri, which explicitly prohibit automated access (we hit real 403s from those this session; every ATS endpoint here was instead verified live, returning real job data, before being wired in).

**Does not cover Naukri, IIMJobs, Hirist, Foundit, or Shine** — no legal API exists for those. Keep checking those through the app's own platform grid (it now tracks "last checked" per platform for exactly this reason).

## Adding your own target companies

Edit `agent/companies.json` — an array of `{ "name": ..., "ats": ..., "slug": ... }`. `ats` must be one of `greenhouse`, `lever`, `ashby`, `smartrecruiters`, `workable`, `recruitee`. To find a company's slug, look at their careers page URL:

| ATS | Careers URL looks like | Slug |
|---|---|---|
| Greenhouse | `boards.greenhouse.io/acme` | `acme` |
| Lever | `jobs.lever.co/acme` | `acme` |
| Ashby | `jobs.ashbyhq.com/acme` | `acme` |
| SmartRecruiters | `jobs.smartrecruiters.com/Acme` | `Acme` |
| Workable | `apply.workable.com/acme` | `acme` |
| Recruitee | `acme.recruitee.com` | `acme` |

If a company doesn't use one of these six ATS platforms (e.g. Workday, BambooHR — confirmed no stable public API, or an in-house careers page), it can't be added here. Use the app's own Watchlist tab and its Google-dork "hidden postings" link instead.

Only postings whose title matches a product-management pattern (`Product Manager`, `Head/Director/VP of Product`, etc. — see `PM_TITLE_REGEX` in `scan-jobs.mjs`) get through to Telegram; each company feed returns every open role, not just PM ones.

**Shortcut from the app:** on the Watchlist tab, pick an ATS type + slug when adding a company, then hit "Copy for agent" on its card — it copies the exact `{ "name", "ats", "slug" }` JSON entry to paste into `companies.json`. The Watchlist (browser localStorage) and this file (the git repo) are separate lists with no automatic sync — that button is the manual bridge between them.

## Weekly link health-check (`check-links.mjs`)

The app's platform grid (`src/data/platforms.js`) hardcodes 28 search-URL builders — sites redesign their URL structure without notice, quietly turning a working link into a 404. This job requests every platform's generated URL once a week and flags only unambiguous breakage: a DNS/connection failure, or an HTTP 404/410.

It deliberately ignores 401/403/405/429/503 — several boards (LinkedIn, Naukri, Glassdoor...) block plain automated requests outright even though the site is completely fine for a real visitor, so treating those as "broken" would just be weekly false-alarm noise. Silent when everything's clean; one Telegram digest listing anything flagged, so a genuine break gets caught before a user clicks a dead link — not a stale example someone happens to notice months later.

To test it manually: **Actions** tab → **Weekly platform link check** → **Run workflow**.

## One-time setup (all free, ~10 minutes total)

### 1. Adzuna API key
1. Go to https://developer.adzuna.com/ and sign up.
2. Create an app — you'll get an `App ID` and `App Key` instantly.

### 2. JSearch (RapidAPI) key
1. Go to https://rapidapi.com/ and sign up.
2. Search for "JSearch" (by letscrape), subscribe to the **free** tier.
3. Copy your RapidAPI key from the app's dashboard.

### 3. Telegram bot
1. In Telegram, message **@BotFather** → `/newbot` → follow the prompts. You'll get a bot token.
2. Message your new bot anything (e.g. "hi") so it can see your chat.
3. Run: `curl https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` and find `"chat":{"id":...}` in the response — that number is your chat ID.

## Add the secrets to GitHub

In this repo: **Settings → Secrets and variables → Actions → New repository secret**, add all five:

- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
- `RAPIDAPI_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## Test it

Go to the **Actions** tab → **Scan for new PM jobs** → **Run workflow** to trigger it manually instead of waiting for the next scheduled run. Check the run's logs — it prints how many jobs it found per source (Adzuna, JSearch, and "company ATS feeds"), and confirms on the first run that it recorded a baseline without alerting. Every run after that only messages you about what's actually new.
