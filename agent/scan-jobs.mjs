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

const AGENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SEEN_FILE = path.join(AGENT_DIR, 'seen-jobs.json');
const COMPANIES_FILE = path.join(AGENT_DIR, 'companies.json');
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

async function sendTelegram(newJobs) {
  const token = env('TELEGRAM_BOT_TOKEN');
  const chatId = env('TELEGRAM_CHAT_ID');
  if (!token || !chatId) {
    console.log('Telegram: skipped (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set) — new jobs found but not sent:', newJobs.length);
    return;
  }
  const shown = newJobs.slice(0, 15);
  const lines = shown.map(j => `• ${j.title} — ${j.company} (${j.location || 'India'})\n  ${j.url}\n  [${j.source}]`);
  let text = `🎯 ${newJobs.length} new PM job${newJobs.length === 1 ? '' : 's'} found:\n\n${lines.join('\n\n')}`;
  if (newJobs.length > shown.length) text += `\n\n…and ${newJobs.length - shown.length} more.`;
  // Telegram caps messages at 4096 chars — trim defensively rather than fail the send
  if (text.length > 4000) text = text.slice(0, 3990) + '\n…(truncated)';

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) console.error('Telegram send failed:', await res.text());
}

async function loadSeen() {
  try {
    const raw = await fs.readFile(SEEN_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { ids: [], firstRun: true };
  }
}

async function saveSeen(ids) {
  // Keep the file bounded — retain only the most recent 500 ids
  const trimmed = ids.slice(-500);
  await fs.writeFile(SEEN_FILE, JSON.stringify({ ids: trimmed, firstRun: false }, null, 2));
}

async function main() {
  const [adzuna, jsearch, companyATS] = await Promise.all([fetchAdzuna(), fetchJSearch(), fetchCompanyATS()]);
  const allJobs = [...adzuna, ...jsearch, ...companyATS];
  console.log(`Fetched ${adzuna.length} from Adzuna, ${jsearch.length} from JSearch, ${companyATS.length} from company ATS feeds (${allJobs.length} total).`);

  const seen = await loadSeen();
  const seenSet = new Set(seen.ids);
  const newJobs = allJobs.filter(j => j.id && !seenSet.has(j.id));

  if (seen.firstRun) {
    console.log('First run — recording current jobs as a baseline, not sending an alert for all of them.');
  } else if (newJobs.length > 0) {
    console.log(`${newJobs.length} new job(s) since last run.`);
    await sendTelegram(newJobs);
  } else {
    console.log('No new jobs since last run.');
  }

  await saveSeen([...seen.ids, ...allJobs.map(j => j.id)]);
}

main().catch(err => {
  console.error('Agent run failed:', err);
  process.exit(1);
});
