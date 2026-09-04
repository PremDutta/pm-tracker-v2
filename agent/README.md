# Job scanning agent

Runs every 6 hours via GitHub Actions (free, unlimited on this public repo), checks Adzuna + JSearch for new "Product Manager" postings in India, and pings you on Telegram only when something new shows up. No server, no cost, no scraping — both sources are licensed APIs, not ToS-violating scrapers.

**Does not cover Naukri, IIMJobs, Hirist, Foundit, or Shine** — no legal API exists for those. Keep checking those through the app's own platform grid (it now tracks "last checked" per platform for exactly this reason).

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

Go to the **Actions** tab → **Scan for new PM jobs** → **Run workflow** to trigger it manually instead of waiting for the next scheduled run. Check the run's logs to confirm it fetched jobs and (on the first run) recorded a baseline without alerting — every run after that only messages you about what's actually new.
