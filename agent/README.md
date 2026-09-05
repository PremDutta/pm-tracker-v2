# Job scanning agent

Runs every 6 hours via GitHub Actions (free, unlimited on this public repo), and pings you on Telegram only when something new shows up. No server, no cost, no scraping. Two kinds of sources, both legal:

1. **Adzuna + JSearch** — general aggregators, searches "Product Manager" broadly across India.
2. **Direct ATS feeds** (Greenhouse, Lever, Ashby, SmartRecruiters, Workable) for the specific companies you list in `agent/companies.json`. This is the same technique TrueUp's core data layer uses — these APIs are public and unauthenticated *because companies deliberately expose them* to be embedded on their own careers pages, unlike LinkedIn/Naukri, which explicitly prohibit automated access (we hit real 403s from those this session; every ATS endpoint here was instead verified live, returning real job data, before being wired in).

**Does not cover Naukri, IIMJobs, Hirist, Foundit, or Shine** — no legal API exists for those. Keep checking those through the app's own platform grid (it now tracks "last checked" per platform for exactly this reason).

## Adding your own target companies

Edit `agent/companies.json` — an array of `{ "name": ..., "ats": ..., "slug": ... }`. `ats` must be one of `greenhouse`, `lever`, `ashby`, `smartrecruiters`, `workable`. To find a company's slug, look at their careers page URL:

| ATS | Careers URL looks like | Slug |
|---|---|---|
| Greenhouse | `boards.greenhouse.io/acme` | `acme` |
| Lever | `jobs.lever.co/acme` | `acme` |
| Ashby | `jobs.ashbyhq.com/acme` | `acme` |
| SmartRecruiters | `jobs.smartrecruiters.com/Acme` | `Acme` |
| Workable | `apply.workable.com/acme` | `acme` |

If a company doesn't use one of these five ATS platforms (e.g. Workday, or an in-house careers page), it can't be added here — there's no public API for those. Use the app's own Watchlist tab and its Google-dork "hidden postings" link instead.

Only postings whose title matches a product-management pattern (`Product Manager`, `Head/Director/VP of Product`, etc. — see `PM_TITLE_REGEX` in `scan-jobs.mjs`) get through to Telegram; each company feed returns every open role, not just PM ones.

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
