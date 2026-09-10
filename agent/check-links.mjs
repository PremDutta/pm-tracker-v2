// Weekly link health-check. Runs via .github/workflows/check-links.yml.
//
// Builds each platform's real search URL (same getUrl() the app itself
// calls) and requests it, flagging only unambiguous breakage — DNS/connection
// failures and HTTP 404/410. Deliberately does NOT flag 401/403/429/503:
// several platforms (LinkedIn, Naukri, Glassdoor...) block plain server-side
// fetch()/bot traffic even though the site works fine in a real browser, so
// treating those as "broken" would just be false-alarm noise every week.
//
// Sends one Telegram digest of anything flagged; silent when everything's
// clean (no daily noise for a check that's expected to almost always pass).
import { PLATFORMS } from '../src/data/platforms.js';
import { sendTelegram } from './notify.mjs';

const NOISE_STATUSES = new Set([401, 403, 405, 429, 503]);
const SAMPLE_ROLE = 'Product Manager';
const SAMPLE_LOCATION = 'Bangalore';
// Several boards reject requests with no/generic User-Agent outright (their
// own bot-defense, unrelated to whether the page itself is up) — a real
// browser UA cuts down on that class of false positive.
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function checkPlatform(id, platform) {
  let url;
  try {
    url = platform.getUrl(SAMPLE_ROLE, SAMPLE_LOCATION, { region: platform.region, freshness: {}, experience: {} });
  } catch (err) {
    return { id, name: platform.name, url: null, problem: `getUrl() threw: ${err.message}` };
  }

  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': BROWSER_UA }, signal: AbortSignal.timeout(15000) });
    if (res.status === 404 || res.status === 410) {
      return { id, name: platform.name, url, problem: `HTTP ${res.status}` };
    }
    if (!res.ok && !NOISE_STATUSES.has(res.status)) {
      return { id, name: platform.name, url, problem: `HTTP ${res.status}` };
    }
    return null;
  } catch (err) {
    return { id, name: platform.name, url, problem: `Fetch failed: ${err.message}` };
  }
}

async function main() {
  const entries = Object.entries(PLATFORMS);
  const results = await Promise.all(entries.map(([id, platform]) => checkPlatform(id, platform)));
  const broken = results.filter(Boolean);

  console.log(`Checked ${entries.length} platforms — ${broken.length} possibly broken.`);
  broken.forEach(b => console.log(`  ✗ ${b.name}: ${b.problem} (${b.url || 'n/a'})`));

  if (broken.length === 0) return;

  const lines = broken.map(b => `• ${b.name}: ${b.problem}${b.url ? `\n  ${b.url}` : ''}`);
  const text = `⚠️ Weekly link check: ${broken.length} platform${broken.length === 1 ? '' : 's'} may be broken:\n\n${lines.join('\n\n')}\n\nSome of these can be false alarms (a site blocking automated requests, not an actual dead link) — worth a manual click before editing src/data/platforms.js.`;
  await sendTelegram(text);
}

main().catch(err => {
  console.error('Link check run failed:', err);
  process.exit(1);
});
