# Job scanning agent

Two scheduled GitHub Actions jobs, both free and unlimited on this public repo, both alerting via the same Telegram bot (shared sending logic lives in `notify.mjs`):

- **`scan-jobs.mjs`** (every 6 hours) — watches for new postings.
- **`check-links.mjs`** (weekly, Mondays) — watches for platform links going dead. See "Weekly link health-check" below.

## Job scanning (`scan-jobs.mjs`)

Pings you on Telegram only when something new shows up. No server, no cost, no scraping. Two kinds of sources, both legal:

1. **Adzuna + JSearch** — general aggregators, searches "Product Manager" broadly across India.
2. **Direct ATS feeds** (Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee) for the specific companies you list in `agent/companies.json`. This is the same technique TrueUp's core data layer uses — these APIs are public and unauthenticated *because companies deliberately expose them* to be embedded on their own careers pages, unlike LinkedIn/Naukri, which explicitly prohibit automated access (we hit real 403s from those this session; every ATS endpoint here was instead verified live, returning real job data, before being wired in).

3. **Government / PSU sources with structured data** (`govt.mjs`): NPCI (including NBBL and NIPL), RBI Innovation Hub, Digital India Corporation's recruitment portal (NeGD, IndiaAI, Bhashini...), CSC e-Governance, NHAI, and the Bharat Digital public-interest tech board. Which sources exist and how their fields map is data in `govt-sources.json`, generated from the `india-govt-search` registry by `scripts/sync-govt-registry.mjs`, so adding a source is a registry edit plus a re-sync, not new code.
   - Govt orgs rarely title roles "Product Manager", so these use a looser filter: any title with "product", minus design/marketing/sales/support and apprentice/trainee/fresher schemes.
   - Eligibility rules are the same as the ai-job-search digest: deputation / serving-govt-employee-only roles are dropped; age limit, MBA, contract and corrigendum are shown as flags. Alerts include the last date when the source has one, and govt roles are listed first.
   - Every run writes the current openings to `govt-openings.json`, which the app's **Govt & PSU** tab reads live from GitHub. A source that fails in a run keeps its last-known openings instead of vanishing.
   - Most PSUs only publish PDF notices; those aren't scanned here. They're covered by the app's org directory (7-day "last checked" tracking) and the ai-job-search digest.
   - Tests: `node --test agent/govt.test.mjs` (also run in CI).

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

It also checks the careers page of every org in the app's Govt & PSU directory. Many Indian govt sites serve incomplete TLS certificate chains (browsers repair these, Node doesn't) and several time out or refuse connections from outside India, where GitHub's runners are, so for govt pages only a missing domain or a 404/410 is flagged; the rest is logged, not alerted. Requests go out 8 at a time with one retry.

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
