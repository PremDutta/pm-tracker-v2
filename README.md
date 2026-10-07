# PM Jobs Tracker

[![CI](https://github.com/PremDutta/pm-tracker-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/PremDutta/pm-tracker-v2/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)

**Every PM role in India, found before the crowd.** Live at **[pm-tracker-v2.vercel.app](https://pm-tracker-v2.vercel.app)**.

A job search toolkit for Product Manager, Senior PM and Group PM roles in India. A background scanner reads 97 company job boards, YC, VC portfolio boards and 143 government sources every 6 hours; the app shows what's open now, flags what's new, and sends one 8 AM digest so you apply first.

It's a static React app (no backend, no database) plus a scheduled Node scanner on GitHub Actions. Everything you enter (applications, watchlist, network, profile) stays in your browser's `localStorage`.

## What's in it

### Live roles (refreshed every 6 hours)
- **Top Companies:** 227 companies with their careers pages: 131 Indian unicorns, 42 AI companies, 18 big tech, 13 IT services majors (Infosys, TCS, Wipro, HCLTech...), banks and GCCs, consulting and Indian enterprises. For the 97 with a readable job feed, open PM roles in India are listed live, with filters for level, city and "New (3 days)", the last-scan time and a Refresh button.
- **AI PM:** AI / ML / GenAI product roles in India or remote-open-to-India, filterable by PM, Senior PM, Group / Principal / Lead and Head / Director / VP, plus 8 AI-specific searches.
- **YC startups:** PM roles at Y Combinator startups that are India-based or remote with India allowed ("Remote (US)" style roles are left out). In the Remote tab and the AI PM tab.
- **Govt & PSU:** open product roles at NPCI, RBI Innovation Hub, NeGD / Digital India, ONDC, eGov and more, sorted by closing date with eligibility flags (age limit, MBA, contract). A directory of 65 govt, PSU, public sector bank and govt-backed orgs marks each one **Auto-scanned** or **Check manually**.
- **Hiring Signals:** reposted PM roles (the first hire fell through), engineering hiring spikes (new product lines need PMs next) and funding rounds, plus Peak XV, Lightspeed and Accel portfolio boards.

### Search
- **Role toggle:** PM / Senior PM / Group PM. Every search, alert and job-board link follows it (Senior PM searches include "sr. product manager", "senior PM" and "SPM").
- **28 job boards:** Naukri, LinkedIn, IIMJobs, Instahyre, Wellfound, Cutshort, remote and international boards, filterable by city, posted-within and experience where the site supports it.
- **LinkedIn power links:** "new since your last check" (only jobs posted after you last opened LinkedIn from the app, via LinkedIn's `f_TPR=a<timestamp>-` cutoff) and LinkedIn's newer AI search for your role and for AI roles.
- **41 Google search hacks** in 8 categories: Be First, Hidden Jobs (founder posts, Notion, Google Sheets), **ATS Direct** (Ashby, Greenhouse, Lever, Workday, Workable, SmartRecruiters and 12 more, India-filtered), Senior PM, Referrals, Remote, **AI PM** and **Hiring Signals** (funding, new CPOs, govt PMU contract awards). Every query stays within Google's 32-word limit for all three roles.

### Applying
- **Application Tracker:** Applied → Screening → Interview → Offer / Rejected, follow-up nudges after 7 days, and a **teardown brief** you paste into any AI assistant to draft a one-page product teardown for the hiring manager.
- **Watchlist + My network:** target companies with careers links, hidden-posting searches and outreach drafts. List your ex-colleagues once, and every company where you know someone is flagged across the app so you ask for a referral first.
- **Resume ↔ JD Match:** resume parsed in the browser (PDF / DOCX / TXT), stemmed keyword and phrase matching, requirement and experience-years checks, saved versions, and a "copy gap summary for AI" handoff.
- **Templates, alert setup guide and "be first to apply" playbook.**

### Alerts (Telegram and/or WhatsApp)
- **8:00 AM IST digest:** new govt roles, new PM roles, govt roles closing this week and hiring signals, in one message.
- **Urgent, any time:** a new govt role closing within 3 days, deadline reminders 3 days and 1 day before, and reposted PM roles.
- Setup and secrets: [`agent/README.md`](agent/README.md).

### Release announcements
New features pop up once with a **Go to feature** button, and the megaphone in the top bar always lists every release. Entries live in `src/data/whatsNew.js`.

## How the scanner works

`agent/scan-jobs.mjs` runs on GitHub Actions every 6 hours (plus an 8 AM IST digest run), then commits its output files back to the repo. The app reads those files live from GitHub, so new roles show up without a redeploy.

| Source | Reader | Output |
|---|---|---|
| Your target companies + the 97-company directory | Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee, Zoho Recruit, Keka, Freshteam, Rippling, Workday, Eightfold, Oracle Recruiting Cloud, SuccessFactors, amazon.jobs | `company-roles.json` |
| 143 govt / PSU sources | JSON feeds, embedded JSON and careers-page notice links (`govt.mjs`, `govt-notices.mjs`) | `govt-openings.json` |
| YC startups | `yc.mjs` | `yc-roles.json` |
| AI roles across all of the above | `snapshots.mjs` | `ai-roles.json` |
| Funding news, reposts, engineering spikes | `funding.mjs`, `signals.mjs` | `signals.json` |
| Peak XV, Lightspeed, Accel | `vc-boards.mjs` | alerts + `ai-roles.json` |

It only reads sources that are deliberately public: company job-board APIs meant for embedding, public careers pages and RSS feeds. It doesn't scrape LinkedIn or Naukri (their terms prohibit it); for those the app links to their own search. Companies whose careers sites block automated reads (Darwinbox, custom portals like TCS iBegin) stay as links.

**Run a scan now:** Actions → *Scan for new PM jobs* → *Run workflow* (tick *send digest* to get the digest immediately). **Preview alerts without sending:** `ALERTS_DRY_RUN=1 SEND_DIGEST=1 node agent/scan-jobs.mjs`.

## Local development

```bash
npm install
npm start                          # dev server at localhost:3000
npm test                           # app tests (Jest + React Testing Library)
node --test agent/govt.test.mjs    # scanner tests
npm run build                      # production build (CI runs all three)
```

Requires Node 18+ (the scanner runs on Node 20 in CI).

## Project structure

```
pm-tracker-v2/
├── agent/                         # scheduled scanner (see agent/README.md)
│   ├── scan-jobs.mjs              # entry point: fetch, dedupe, queue alerts, write outputs
│   ├── enterprise-ats.mjs         # Eightfold, Oracle, SuccessFactors, amazon.jobs
│   ├── govt.mjs / govt-notices.mjs
│   ├── yc.mjs / vc-boards.mjs / funding.mjs / signals.mjs / snapshots.mjs
│   ├── digest.mjs                 # 8 AM digest, urgent alerts, deadline reminders
│   ├── notify.mjs                 # Telegram + WhatsApp (CallMeBot)
│   ├── companies.json             # your target companies (you edit this)
│   └── *.json                     # scanner output, read live by the app
├── scripts/
│   ├── build-company-directory.mjs   # company-directory.json -> app + scanner lists
│   ├── sync-govt-registry.mjs        # govt registry -> app + scanner lists
│   └── govt-extra-orgs.json          # local govt / DPI additions
├── src/
│   ├── App.js                     # shell: nav, role toggle, tabs, announcements
│   ├── tabs/                      # one file per tab
│   ├── components/                # Tracker, Watchlist, ResumeMatch, HackCard, Announcements...
│   └── data/                      # platforms, hacks, roles, LinkedIn links, whatsNew; GENERATED: companyDirectory.js, govtOrgsList.js
└── .github/workflows/             # ci.yml, job-scan.yml (every 6h + 8 AM digest), check-links.yml (weekly)
```

## Updating the lists

- **Companies tab:** edit `scripts/company-directory.json`, then `node scripts/build-company-directory.mjs`. It regenerates `src/data/companyDirectory.js` and `agent/directory-companies.json`.
- **Govt & PSU:** generated from the `india-govt-search` registry in the private ai-job-search repo, plus `scripts/govt-extra-orgs.json`. Run `node scripts/sync-govt-registry.mjs [path/to/orgs.json]`.
- **Your own target companies:** edit `agent/companies.json` (or use **Copy for agent** on a Watchlist card).

Don't hand-edit generated files.

## Deployment

Deployed on [Vercel](https://vercel.com) at **[pm-tracker-v2.vercel.app](https://pm-tracker-v2.vercel.app)**; every push to `main` redeploys. CI (tests, scanner tests, build) runs on every push and PR.

## License

[MIT](LICENSE)
