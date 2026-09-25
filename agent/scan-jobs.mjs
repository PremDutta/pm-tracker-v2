// Free-tier job scanning agent.
//
// Runs on a schedule via .github/workflows/job-scan.yml (GitHub Actions cron,
// free/unlimited on this public repo). Pulls from two sources:
//   1. Adzuna + JSearch (RapidAPI) — general aggregators for "Product Manager"
//      roles in India.
//   2. Direct ATS APIs (Greenhouse, Lever, Ashby, SmartRecruiters, Workable)
//      for the specific companies listed in agent/companies.json — this is
//      the same technique TrueUp uses for its core job data: these APIs are
//      public and unauthenticated *because companies deliberately expose them
//      to be embedded/aggregated elsewhere*, unlike LinkedIn/Naukri, which
//      explicitly prohibit this and which we hit 403s against ourselves this
//      session. Every endpoint below was verified live against a real company
//      before being wired in, not guessed from docs.
//   3. Indian government / PSU / govt-backed sources with structured data
//      (see govt.mjs + govt-sources.json): NPCI and subsidiaries, RBIH, DIC's
//      recruitment portal, CSC, NHAI, Bharat Digital. Looser title filter,
//      since govt orgs rarely title roles "Product Manager".
//
// Diffs against what it saw last run (agent/seen-jobs.json, committed back to
// the repo by the workflow), and pings Telegram only with what's new.
//
// Deliberately does NOT touch Naukri, IIMJobs, Hirist, Foundit, or Shine —
// no legal API exists for those. Those stay covered by the app's own
// link-launcher + "last checked" tracking instead of scraping.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendAlert } from './notify.mjs';
import { fetchGovtOpenings } from './govt.mjs';

const AGENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SEEN_FILE = path.join(AGENT_DIR, 'seen-jobs.json');
const COMPANIES_FILE = path.join(AGENT_DIR, 'companies.json');
// Current govt PM openings, read by the app's Govt & PSU tab straight from GitHub.
const GOVT_OPENINGS_FILE = path.join(AGENT_DIR, 'govt-openings.json');
const env = (name) => process.env[name];

// Broad enough to catch "Product Manager", "Senior Product Manager", "Group
// Product Manager", "Product Owner", "Head/Director/VP of Product" — company
// ATS feeds return every open role, not just PM ones, so this filters them
// down before anything reaches Telegram. Adjust to taste.
const PM_TITLE_REGEX = /product\s*(manager|owner)|head\s+of\s+product|director.{0,15}product|vp.{0,15}product|group\s*product\s*manager/i;

async function fetchAdzuna() {
  const appId = env('ADZUNA_APP_ID');
  const appKey = env('ADZUNA_APP_KEY');
  if (!appId || !appKey) {
    console.log('Adzuna: skipped (ADZUNA_APP_ID / ADZUNA_APP_KEY not set)');
    return [];
  }
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=30&what=product%20manager&content-type=application/json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.results || []).map(j => ({
      id: `adzuna-${j.id}`,
      title: j.title,
      company: j.company?.display_name || 'Unknown',
      location: j.location?.display_name || '',
      url: j.redirect_url,
      source: 'Adzuna',
    }));
  } catch (err) {
    console.error('Adzuna fetch failed:', err.message);
    return [];
  }
}

async function fetchJSearch() {
  const key = env('RAPIDAPI_KEY');
  if (!key) {
    console.log('JSearch: skipped (RAPIDAPI_KEY not set)');
    return [];
  }
  try {
    const url = 'https://jsearch.p.rapidapi.com/search?query=' + encodeURIComponent('Product Manager in India') + '&page=1&num_pages=1&date_posted=today';
    const res = await fetch(url, {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.data || []).map(j => ({
      id: `jsearch-${j.job_id}`,
      title: j.job_title,
      company: j.employer_name || 'Unknown',
      location: [j.job_city, j.job_country].filter(Boolean).join(', '),
      url: j.job_apply_link,
      source: 'JSearch (' + (j.job_publisher || 'aggregated') + ')',
    }));
  } catch (err) {
    console.error('JSearch fetch failed:', err.message);
    return [];
  }
}

async function loadCompanies() {
  try {
    const raw = await fs.readFile(COMPANIES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.log('companies.json: none found or unreadable, skipping ATS scan —', err.message);
    return [];
  }
}

// Verified live: GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
// -> { jobs: [{ id, title, location:{name}, updated_at, absolute_url }] }
async function fetchGreenhouse(company) {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.jobs || []).map(j => ({
    id: `greenhouse-${company.slug}-${j.id}`,
    title: j.title,
    company: company.name,
    location: j.location?.name || '',
    url: j.absolute_url,
    source: `Greenhouse (${company.name})`,
  }));
}

// Verified live: GET https://api.lever.co/v0/postings/{slug}?mode=json
// -> [{ id, text, categories:{location}, createdAt, hostedUrl }]
async function fetchLever(company) {
  const res = await fetch(`https://api.lever.co/v0/postings/${company.slug}?mode=json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return []; // Lever returns {"ok":false,...} for an unknown slug
  return data.map(j => ({
    id: `lever-${company.slug}-${j.id}`,
    title: j.text,
    company: company.name,
    location: j.categories?.location || '',
    url: j.hostedUrl,
    source: `Lever (${company.name})`,
  }));
}

// Verified live: GET https://api.ashbyhq.com/posting-api/job-board/{slug}
// -> { jobs: [{ id, title, location, publishedAt, jobUrl }] }
async function fetchAshby(company) {
  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${company.slug}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.jobs || []).map(j => ({
    id: `ashby-${company.slug}-${j.id}`,
    title: j.title,
    company: company.name,
    location: j.location || '',
    url: j.jobUrl || j.applyUrl,
    source: `Ashby (${company.name})`,
  }));
}

// Verified live: GET https://api.smartrecruiters.com/v1/companies/{slug}/postings
// -> { content: [{ id, name, location:{fullLocation}, company:{identifier} }] }
// No URL field in the list response — the public posting URL is constructed
// as jobs.smartrecruiters.com/{identifier}/{id}, confirmed live (200).
async function fetchSmartRecruiters(company) {
  const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${company.slug}/postings`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.content || []).map(j => ({
    id: `smartrecruiters-${company.slug}-${j.id}`,
    title: j.name,
    company: company.name,
    location: j.location?.fullLocation || '',
    url: `https://jobs.smartrecruiters.com/${j.company?.identifier || company.slug}/${j.id}`,
    source: `SmartRecruiters (${company.name})`,
  }));
}

// Verified live: GET https://apply.workable.com/api/v1/widget/accounts/{slug}
// -> { jobs: [{ title, url, application_url, city, country, created_at }] }
async function fetchWorkable(company) {
  const res = await fetch(`https://apply.workable.com/api/v1/widget/accounts/${company.slug}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.jobs || []).map(j => ({
    id: `workable-${company.slug}-${j.shortcode || j.code}`,
    title: j.title,
    company: company.name,
    location: [j.city, j.country].filter(Boolean).join(', '),
    url: j.url || j.application_url,
    source: `Workable (${company.name})`,
  }));
}

// Verified live: GET https://{slug}.recruitee.com/api/offers/
// -> { offers: [{ id, title, location, careers_apply_url }] }
async function fetchRecruitee(company) {
  const res = await fetch(`https://${company.slug}.recruitee.com/api/offers/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.offers || []).map(j => ({
    id: `recruitee-${company.slug}-${j.id}`,
    title: j.title,
    company: company.name,
    location: j.location || '',
    url: j.careers_apply_url,
    source: `Recruitee (${company.name})`,
  }));
}

const ATS_FETCHERS = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
  smartrecruiters: fetchSmartRecruiters,
  workable: fetchWorkable,
  recruitee: fetchRecruitee,
};

async function fetchCompanyATS() {
  const companies = await loadCompanies();
  if (companies.length === 0) return [];

  const results = await Promise.all(companies.map(async (company) => {
    const fetcher = ATS_FETCHERS[company.ats];
    if (!fetcher) {
      console.error(`${company.name}: unknown ats "${company.ats}" — must be one of ${Object.keys(ATS_FETCHERS).join(', ')}`);
      return [];
    }
    try {
      const jobs = await fetcher(company);
      return jobs.filter(j => j.title && PM_TITLE_REGEX.test(j.title));
    } catch (err) {
      console.error(`${company.name} (${company.ats}) fetch failed:`, err.message);
      return [];
    }
  }));

  return results.flat();
}

const FLAG_LABELS = { age_limit_mentioned: 'age limit', mba_mentioned: 'MBA asked', contract: 'contract', corrigendum: 'corrigendum' };

// Deadline + eligibility flags, for govt notices that carry them.
function govtNote(job) {
  const bits = [];
  if (job.deadline) bits.push(`closes ${job.deadline}`);
  for (const f of job.flags || []) if (FLAG_LABELS[f]) bits.push(FLAG_LABELS[f]);
  return bits.length ? `\n  ⏳ ${bits.join(' · ')}` : '';
}

// Same title at the same company (NBBL often posts one role twice) is one line
// with a count, not two identical alerts.
function groupDuplicates(jobs) {
  const groups = new Map();
  for (const j of jobs) {
    const key = `${j.title.toLowerCase().replace(/\s+/g, ' ').trim()}|${j.company.toLowerCase()}`;
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { ...j, count: 1 });
  }
  return [...groups.values()];
}

async function alertNewJobs(newJobs) {
  // Govt roles first: they're rarer, and must never fall below the 15-item cut.
  const grouped = groupDuplicates(newJobs);
  const ordered = [...grouped.filter(j => j.id.startsWith('govt-')), ...grouped.filter(j => !j.id.startsWith('govt-'))];
  const shown = ordered.slice(0, 15);
  const lines = shown.map(j => `• ${j.title} — ${j.company} (${j.location || 'India'})${j.count > 1 ? ` ×${j.count} openings` : ''}${govtNote(j)}\n  ${j.url}\n  [${j.source}]`);
  let text = `🎯 ${newJobs.length} new PM job${newJobs.length === 1 ? '' : 's'} found:\n\n${lines.join('\n\n')}`;
  if (ordered.length > shown.length) text += `\n\n…and ${ordered.length - shown.length} more.`;
  if (shown.some(j => j.id.startsWith('govt-'))) text += '\n\nAll open govt roles: https://pm-tracker-v2.vercel.app (Govt & PSU tab)';
  await sendAlert(text);
}

async function loadSeen() {
  try {
    const raw = await fs.readFile(SEEN_FILE, 'utf8');
    return { baselinedOrgs: [], ...JSON.parse(raw) };
  } catch {
    return { ids: [], firstRun: true, baselinedOrgs: [] };
  }
}

async function saveSeen(ids, baselinedOrgs) {
  // Keep the file bounded: the most recent 3000 ids (govt careers pages add a
  // few hundred notice ids on top of the job feeds).
  const trimmed = ids.slice(-3000);
  await fs.writeFile(SEEN_FILE, JSON.stringify({ ids: trimmed, firstRun: false, baselinedOrgs: [...baselinedOrgs].sort() }, null, 2));
}

// Writes the current govt openings for the app. A source that failed this run
// keeps its last-known openings rather than vanishing from the app; firstSeen
// is carried over so the app can badge what's new. lastRead records, per org,
// the last day the scanner could read it, so the app can say which orgs are
// covered automatically and which (geo-blocked, JS-only) need a manual check.
async function saveGovtOpenings({ jobs, failed, readOk }) {
  let previous = { openings: [], lastRead: {} };
  try {
    previous = { ...previous, ...JSON.parse(await fs.readFile(GOVT_OPENINGS_FILE, 'utf8')) };
  } catch { /* first run */ }
  const firstSeenById = new Map(previous.openings.map(o => [o.id, o.firstSeen]));
  const today = new Date().toISOString().slice(0, 10);
  // Carry-over is for a flaky day, not forever: once an org hasn't been read
  // for 7 days its old openings drop out (the app then marks it "Check manually").
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const kept = previous.openings.filter(o => failed.includes(o.org) && (previous.lastRead[o.org] || '') >= weekAgo);
  const openings = [...jobs.map(j => ({ ...j, firstSeen: firstSeenById.get(j.id) || today })), ...kept]
    .sort((a, b) => (b.firstSeen || '').localeCompare(a.firstSeen || '') || a.id.localeCompare(b.id));
  const lastRead = { ...previous.lastRead };
  for (const org of readOk) lastRead[org] = today;
  const sortedLastRead = Object.fromEntries(Object.entries(lastRead).sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(GOVT_OPENINGS_FILE, JSON.stringify({ openings, lastRead: sortedLastRead }, null, 2) + '\n');
  return jobs;
}

async function main() {
  const [adzuna, jsearch, companyATS, govtResult] = await Promise.all([fetchAdzuna(), fetchJSearch(), fetchCompanyATS(), fetchGovtOpenings()]);
  const govt = await saveGovtOpenings(govtResult);
  const allJobs = [...adzuna, ...jsearch, ...companyATS, ...govt];
  console.log(`Fetched ${adzuna.length} from Adzuna, ${jsearch.length} from JSearch, ${companyATS.length} from company ATS feeds, ${govt.length} from govt/PSU sources (${allJobs.length} total).`);

  const seen = await loadSeen();
  const seenSet = new Set(seen.ids);
  // The first successful read of a govt careers page is a baseline: it can
  // hold every notice currently up, so record those silently and only alert
  // on what appears after. Per org, so a page that was unreachable for
  // weeks doesn't flood the alert the day it comes back.
  // Only a real backlog (4+ matching notices on that first read) is held back;
  // with the notice filter this strict, one or two matches are worth an alert.
  const baselined = new Set(seen.baselinedOrgs);
  const noticeCount = (org) => govt.filter(j => j.org === org && j.id.startsWith('govt-notice-')).length;
  const baselineNow = new Set(govtResult.noticePagesRead.filter(org => !baselined.has(org) && noticeCount(org) > 3));
  const newJobs = allJobs.filter(j => j.id && !seenSet.has(j.id) && !(j.id.startsWith('govt-notice-') && baselineNow.has(j.org)));
  if (baselineNow.size) console.log(`Govt careers pages with a backlog on first read (recorded, no alert): ${[...baselineNow].join(', ')}`);

  if (seen.firstRun) {
    console.log('First run — recording current jobs as a baseline, not sending an alert for all of them.');
  } else if (newJobs.length > 0) {
    console.log(`${newJobs.length} new job(s) since last run.`);
    await alertNewJobs(newJobs);
  } else {
    console.log('No new jobs since last run.');
  }

  // Dedupe — without this, a job that's still listed on a later run (the
  // common case, since postings stay up for weeks) gets re-appended every
  // single run, silently filling the id cap with repeats of the same
  // handful of jobs instead of real history.
  // Every careers page read this run is baselined, including ones with no
  // matching notice yet, so the first real notice on it later does alert.
  await saveSeen([...new Set([...seen.ids, ...allJobs.map(j => j.id)])], new Set([...baselined, ...govtResult.noticePagesRead]));
}

main().catch(err => {
  console.error('Agent run failed:', err);
  process.exit(1);
});
