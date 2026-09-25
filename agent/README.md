# Job scanning agent

Two scheduled GitHub Actions jobs, both free and unlimited on this public repo, both alerting via the same Telegram bot (shared sending logic lives in `notify.mjs`):

- **`scan-jobs.mjs`** (every 6 hours) — watches for new postings.
- **`check-links.mjs`** (weekly, Mondays) — watches for platform links going dead. See "Weekly link health-check" below.

## Job scanning (`scan-jobs.mjs`)

Pings you on Telegram and/or WhatsApp only when something new shows up. No server, no cost, no scraping. Three kinds of sources, all legal:

1. **Adzuna + JSearch** — general aggregators, searches "Product Manager" broadly across India.
2. **Direct ATS feeds** (Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee) for the specific companies you list in `agent/companies.json`. This is the same technique TrueUp's core data layer uses — these APIs are public and unauthenticated *because companies deliberately expose them* to be embedded on their own careers pages, unlike LinkedIn/Naukri, which explicitly prohibit automated access (we hit real 403s from those this session; every ATS endpoint here was instead verified live, returning real job data, before being wired in).

3. **Government / PSU sources with structured data** (`govt.mjs`): NPCI (including NBBL and NIPL), RBI Innovation Hub, Digital India Corporation's recruitment portal (NeGD, IndiaAI, Bhashini...), CSC e-Governance, NHAI, and the Bharat Digital public-interest tech board. Which sources exist and how their fields map is data in `govt-sources.json`, generated from the `india-govt-search` registry by `scripts/sync-govt-registry.mjs`, so adding a source is a registry edit plus a re-sync, not new code.
   - Govt orgs rarely title roles "Product Manager", so these use a looser filter: any title with "product", minus design/marketing/sales/support and apprentice/trainee/fresher schemes.
   - Eligibility rules are the same as the ai-job-search digest: deputation / serving-govt-employee-only roles are dropped; age limit, MBA, contract and corrigendum are shown as flags. Alerts include the last date when the source has one, and govt roles are listed first.
   - Every run writes the current openings to `govt-openings.json`, which the app's **Govt & PSU** tab reads live from GitHub. A source that fails in a run keeps its last-known openings instead of vanishing.
4. **Govt careers pages with no feed** (`govt-notices.mjs`): the other 132 orgs in the registry, most PSUs, PSU banks, insurers and ministries, which publish a page of notice links (often PDFs). Each page's links are read and kept only if they look like a live opening: site menus, scripts, tenders, results, shortlists, forms, closed notices, fresher/trainee schemes and anything whose dates are all 120+ days old are dropped (port of the `india-govt-search` extractor, with stricter rules because these become phone alerts). A notice alerts only if its **title** is a product role, or PM-shaped digital leadership (Programme Manager, Head - Digital, Digital Banking / Transformation...) at an org rated high/medium for PM work. Plain IT roles (IT Officer, Data Scientist) don't. The first read of a page with a backlog (4+ matches) is recorded without alerting.
   - Some sites can't be read from GitHub's US runners (they block non-Indian traffic or need JavaScript). `govt-openings.json` records each org's last successful read, and the app marks every org as **✓ Auto-scanned** or **Check manually** from it, so you know exactly which ones still need a manual look.
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

### 4. WhatsApp (optional, alongside or instead of Telegram)
Uses [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/)'s free personal WhatsApp API: it can only message the number that activated it, which is exactly what alerts to yourself need.
1. Save CallMeBot's number in your phone contacts. It's listed on the page above (it was **+34 694 23 41 84** on 2026-09-25; use whatever the page shows now).
2. From your WhatsApp, send it: `I allow callmebot to send me messages`
3. Within a couple of minutes it replies with your API key.

Messages pass through CallMeBot's servers (job titles and links only, nothing personal). Long alerts arrive as numbered parts (1/2, 2/2).

## Add the secrets to GitHub

In this repo: **Settings → Secrets and variables → Actions → New repository secret**. Alerts go to every channel whose secrets are set:

- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
- `RAPIDAPI_KEY`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- WhatsApp: `WHATSAPP_PHONE` (your number with country code, e.g. `+919812345678`), `CALLMEBOT_APIKEY`

Or from a terminal: `gh secret set WHATSAPP_PHONE` and `gh secret set CALLMEBOT_APIKEY` (each prompts for the value).

## Test it

Go to the **Actions** tab → **Scan for new PM jobs** → **Run workflow** to trigger it manually instead of waiting for the next scheduled run. Check the run's logs — it prints how many jobs it found per source (Adzuna, JSearch, company ATS feeds, govt sources) and which channels each alert was sent to, and confirms on the first run that it recorded a baseline without alerting. Every run after that only messages you about what's actually new.
