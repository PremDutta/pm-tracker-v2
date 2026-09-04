// Free-tier job scanning agent.
//
// Runs on a schedule via .github/workflows/job-scan.yml (GitHub Actions cron,
// free/unlimited on this public repo). Queries two legitimately licensed
// aggregator APIs — Adzuna and JSearch (RapidAPI) — for "Product Manager"
// roles in India, diffs against what it saw last run (agent/seen-jobs.json,
// committed back to the repo by the workflow), and pings Telegram only with
// what's new.
//
// Deliberately does NOT touch Naukri, IIMJobs, Hirist, Foundit, or Shine —
// no legal API exists for those, and this session hit their bot-blocking
// (403s) firsthand. Those stay covered by the app's own link-launcher +
// "last checked" tracking instead of scraping.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SEEN_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seen-jobs.json');
const env = (name) => process.env[name];

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
  const [adzuna, jsearch] = await Promise.all([fetchAdzuna(), fetchJSearch()]);
  const allJobs = [...adzuna, ...jsearch];
  console.log(`Fetched ${adzuna.length} from Adzuna, ${jsearch.length} from JSearch (${allJobs.length} total).`);

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
