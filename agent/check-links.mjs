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
import { GOVT_ORGS } from '../src/data/govtOrgsList.js';
import { sendAlert } from './notify.mjs';

const NOISE_STATUSES = new Set([401, 403, 405, 429, 503]);
const SAMPLE_ROLE = 'Product Manager';
const SAMPLE_LOCATION = 'Bangalore';
// Several boards reject requests with no/generic User-Agent outright (their
// own bot-defense, unrelated to whether the page itself is up) — a real
// browser UA cuts down on that class of false positive.
const CERT_ERROR_CODES = /CERT|UNABLE_TO_GET_ISSUER|UNABLE_TO_VERIFY_LEAF|SELF_SIGNED|ERR_TLS_CERT/;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function checkPlatform(id, platform) {
  let url;
  try {
    url = platform.getUrl(SAMPLE_ROLE, SAMPLE_LOCATION, { region: platform.region, freshness: {}, experience: {} });
  } catch (err) {
    return { id, name: platform.name, url: null, problem: `getUrl() threw: ${err.message}` };
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': BROWSER_UA }, signal: AbortSignal.timeout(20000) });
      if (res.status === 404 || res.status === 410) {
        return { id, name: platform.name, url, problem: `HTTP ${res.status}` };
      }
      if (!res.ok && !NOISE_STATUSES.has(res.status)) {
        return { id, name: platform.name, url, problem: `HTTP ${res.status}` };
      }
      return null;
    } catch (err) {
      // Many Indian govt sites serve an incomplete certificate chain that
      // Node rejects but browsers repair. The server answered, so the link isn't dead.
      if (CERT_ERROR_CODES.test(err.cause?.code || '')) return null;
      lastError = err;
    }
  }
  const code = lastError.cause?.code || lastError.message;
  // A timeout or reset isn't evidence a link is dead: several govt sites (UIDAI,
  // RailTel, PESB...) refuse connections from outside India, where GitHub's
  // runners are, and busy boards (Remote.co, FlexJobs, NaukriGulf) reset bot
  // connections. Only a domain that no longer resolves is flagged; the rest is
  // logged, not alerted.
  if (!/ENOTFOUND/.test(code)) { // EAI_AGAIN is a transient DNS hiccup, not a dead domain
    console.log(`  ~ ${platform.name}: unreachable from this runner (${code}); not flagged`);
    return null;
  }
  return { id, name: platform.name, url, problem: `Domain not found (${code})` };
}

// A few at a time: ~75 simultaneous requests from one runner get throttled or
// dropped by the slower govt servers, which then look "broken".
async function mapLimited(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }));
  return results;
}

// Govt careers pages, checked the same way as a platform. Several orgs share
// one portal (NPCI's board, DIC's ORA), so each URL is requested once; sites
// the registry marks as rejecting all bots are skipped.
const govtTargets = () => {
  const byUrl = new Map();
  for (const o of GOVT_ORGS) {
    if (o.blocksBots || byUrl.has(o.careersUrl)) continue;
    byUrl.set(o.careersUrl, [`govt-${o.id}`, { name: `${o.short} careers (govt)`, getUrl: () => o.careersUrl }]);
  }
  return [...byUrl.values()];
};

async function main() {
  const entries = [...Object.entries(PLATFORMS), ...govtTargets()];
  const results = await mapLimited(entries, 8, ([id, platform]) => checkPlatform(id, platform));
  const broken = results.filter(Boolean);

  console.log(`Checked ${entries.length} platforms + govt careers pages — ${broken.length} possibly broken.`);
  broken.forEach(b => console.log(`  ✗ ${b.name}: ${b.problem} (${b.url || 'n/a'})`));

  if (broken.length === 0) return;

  const lines = broken.map(b => `• ${b.name}: ${b.problem}${b.url ? `\n  ${b.url}` : ''}`);
  const text = `⚠️ Weekly link check: ${broken.length} platform${broken.length === 1 ? '' : 's'} may be broken:\n\n${lines.join('\n\n')}\n\nSome of these can be false alarms (a site blocking automated requests, not an actual dead link) — worth a manual click before editing src/data/platforms.js (job platforms) or the india-govt-search registry + scripts/sync-govt-registry.mjs (govt careers pages).`;
  await sendAlert(text);
}

main().catch(err => {
  console.error('Link check run failed:', err);
  process.exit(1);
});
