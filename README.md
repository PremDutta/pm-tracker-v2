# PM Jobs Tracker

[![CI](https://github.com/PremDutta/pm-tracker-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/PremDutta/pm-tracker-v2/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)

A job search toolkit for Product Manager roles in India — a curated multi-platform launcher, an application tracker, a target-company watchlist with recruiter-outreach drafting, a resume/JD keyword-gap checker, and a free background agent that watches company ATS feeds and general aggregators for new postings.

It's a static React app (no backend, no database) plus one small standalone Node script that runs on a schedule via GitHub Actions. Data you enter (applications, watchlist, profile) lives only in your browser's `localStorage` — there's no server it's sent to.

## Features

- **26 job platforms** — India-specific boards (Naukri, IIMJobs, Instahyre, Foundit, Shine, Hirist, Hirect, Apna, Cutshort, TimesJobs, NaukriGulf), global aggregators (LinkedIn, Indeed, Glassdoor, Wellfound, Levels.fyi, Welcome to the Jungle), remote boards (RemoteOK, We Work Remotely, Remote.co, FlexJobs), and US-focused ones (Built In, Underdog.io, YC Jobs, SimplyHired, Mind the Product) — filterable by city (12 Indian cities), role (Product Manager / Senior PM), posted-within window, and experience level (the last two apply wherever the destination site actually supports them: LinkedIn, Naukri, Indeed).
- **Application Tracker** — a persistent Applied → Screening → Interview → Offer/Rejected board.
- **Target Company Watchlist** — per-company deep links to the careers page, a Google-dork for unlisted postings, a LinkedIn recruiter search, and an auto-generated, profile-personalized outreach draft.
- **Resume ↔ JD Match** — paste both, get a client-side keyword-overlap check. Nothing leaves the browser.
- **18 Google search hacks** — `site:` queries for ATS-hosted listings (Greenhouse, Lever, Workday, Ashby), referral posts, and salary-transparent roles.
- **Job alert setup guide, "be first to apply" playbook, remote/international strategy pages, and LinkedIn message templates** that auto-fill from a saved profile.
- **A free background scanning agent** (`agent/`) — runs every 6 hours on GitHub Actions, pulls from Adzuna, JSearch, and direct ATS APIs (Greenhouse, Lever, Ashby, SmartRecruiters, Workable) for companies you list, and messages you on Telegram only when something's new. See [`agent/README.md`](agent/README.md) for setup.

## Local development

```bash
npm install
npm start       # dev server at localhost:3000
npm test        # Jest + React Testing Library
npm run build   # production build
```

Requires Node 18+.

## Project structure

```
pm-tracker-v2/
├── agent/                    # standalone job-scan agent (see agent/README.md)
│   ├── scan-jobs.mjs
│   └── companies.json        # your target companies for the ATS scanner
├── .github/workflows/
│   ├── ci.yml                 # tests + build on every push/PR
│   └── job-scan.yml           # runs the agent on a schedule
├── src/
│   ├── App.js                 # main app: platform data, tabs, filters
│   ├── storage.js             # localStorage persistence helpers
│   └── components/            # Tracker, Watchlist, ResumeMatch, ProfileEditor
└── public/
```

## Why no backend

Every "job board" here is a link to that platform's own search — the app never scrapes or stores third-party job listings itself. Several platforms (LinkedIn, Naukri) explicitly prohibit automated scraping in their terms of service; the background agent only queries sources with a genuinely public, licensed API (Adzuna, JSearch) or an ATS feed companies deliberately expose for embedding (Greenhouse, Lever, Ashby, SmartRecruiters, Workable).

## Deployment

Not currently deployed anywhere live — it runs locally via `npm start`. To put it on a public URL, connect the repo to [Vercel](https://vercel.com) (auto-detects the CRA build, deploys on every push) or enable GitHub Pages.

## License

[MIT](LICENSE)
