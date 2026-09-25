// Government / PSU openings from structured sources: JSON APIs (Zoho Recruit
// career sites, NHAI's vacancy API, the Bharat Digital board) and JSON embedded
// in careers pages (data-* attributes, Next.js flight payloads).
//
// Which sources exist and how their fields map is data, not code: it lives in
// govt-sources.json, generated from the india-govt-search registry by
// scripts/sync-govt-registry.mjs. The record mapping and eligibility rules
// below are a port of that skill's cli/src/structured.ts + extract.ts, so the
// Telegram alerts and the ai-job-search daily digest judge a notice the same way.
//
// Orgs with no feed (most PSUs: a careers page of notice links / PDFs) are read
// by govt-notices.mjs.

import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractNotices, isAlertableNotice } from './govt-notices.mjs';

const AGENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCES_FILE = path.join(AGENT_DIR, 'govt-sources.json');
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ─── Title + eligibility rules ──────────────────────────────────────────────
// Govt orgs post PM work as "Lead Product Management", "Senior Associate NACH
// Product", "Associate Director - Product": any title with the word "product",
// minus the clearly-not-PM ones.
const PRODUCT_RE = /\bproduct\b/i;
const NOT_PM_RE = /design|\bux\b|\bui\b|marketing|sales|support/i;
// Same list as india-govt-search's FRESHER_RE: schemes a senior PM can't apply to.
export const FRESHER_RE =
  /apprentice|\btrainees?\b|\bgate\b|graduate\s+engineer|\bget\b|management\s+trainee|\bmt\b|internship|\binterns?\b|fresher|stipend|young\s+professionals?\b|\bclerk|peon|multi[\s-]*tasking\s+staff|\bmts\b|driver|constable|nursing|medical\s+officer|staff\s+nurse|para[\s-]*medical|teacher|lecturer|professor|scientist[\s-]*b\b|junior\s+research\s+fellow|\bjrf\b|\bsrf\b|project\s+assistant/i;

export const isGovtPmTitle = (title) => PRODUCT_RE.test(title) && !NOT_PM_RE.test(title) && !FRESHER_RE.test(title);

export function eligibilityFlags(text) {
  const flags = [];
  if (/deputation|absorption|re-?employment|serving\s+(govt|government)\s+(employees|officers|officials)|retired\s+(\w+\s+){0,2}(officers?|officials?|employees|executives|bankers|persons)/i.test(text)) flags.push('deputation_or_govt_employees_only');
  if (/\bage\s*limit|upper\s+age|not\s+(more|older)\s+than\s+\d{2}\s+years|below\s+\d{2}\s+years/i.test(text)) flags.push('age_limit_mentioned');
  if (/\bmba\b|\bpgdm\b|post[\s-]*graduate\s+diploma\s+in\s+management/i.test(text)) flags.push('mba_mentioned');
  if (/corrigendum|addendum|extension\s+of\s+(last\s+)?date|date\s+extended/i.test(text)) flags.push('corrigendum');
  if (/\bfixed\s+tenure|contract(ual)?\s+basis|on\s+contract\b/i.test(text)) flags.push('contract');
  return flags;
}

// ─── Record mapping (port of structured.ts) ─────────────────────────────────
export function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&ndash;|&mdash;/g, '-')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

const htmlToText = (html) => decodeEntities(
  html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|div|h\d|td|th)>/gi, '\n').replace(/<[^>]+>/g, ' '),
).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();

/** Value at a dotted path; `a|b` tries each alternative, first non-empty wins. */
export function getPath(obj, p) {
  if (!p) return undefined;
  for (const alt of p.split('|')) {
    let cur = obj;
    for (const key of alt.split('.')) {
      cur = cur !== null && typeof cur === 'object' && key in cur ? cur[key] : undefined;
      if (cur === undefined) break;
    }
    if (cur !== undefined && cur !== null && cur !== '') return cur;
  }
  return undefined;
}

export function valueText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return /<[a-z!/][\s\S]*>|&[a-z#0-9]+;/i.test(v) ? htmlToText(v) : v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(valueText).filter(Boolean).join('\n');
  if (typeof v === 'object') return Object.values(v).map(valueText).filter(Boolean).join('\n');
  return '';
}

const asList = (p) => (p === undefined ? [] : Array.isArray(p) ? p : [p]);
const MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };

/** First date in the value as YYYY-MM-DD: ISO, DD-MM-YYYY / DD.MM.YYYY / DD/MM/YYYY, or "12 August 2026". */
export function isoDay(v) {
  const s = valueText(v);
  if (!s) return null;
  const pad = (n) => String(n).padStart(2, '0');
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/.exec(s);
  if (m && +m[2] <= 12) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[a-z]*,?\s+(\d{4})\b/.exec(s);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])}`;
  return null;
}

function fillTemplate(template, item) {
  let missing = false;
  const out = template.replace(/\{([^}]+)\}/g, (_, p) => {
    const v = valueText(getPath(item, p));
    if (!v) missing = true;
    return encodeURIComponent(v);
  });
  return missing ? '' : out;
}

export function recordToJob(item, cfg, source) {
  if (item === null || typeof item !== 'object') return null;
  const f = cfg.fields;
  if (cfg.where && !Object.entries(cfg.where).every(([k, v]) => String(getPath(item, k)) === String(v))) return null;
  if (cfg.require && !cfg.require.every(p => valueText(getPath(item, p)))) return null;

  const title = valueText(getPath(item, f.title)).replace(/\s+/g, ' ').trim();
  if (!title) return null;

  const rawId = valueText(getPath(item, f.id));
  let url = valueText(getPath(item, f.url));
  if (!/^https?:\/\//i.test(url)) url = cfg.url_template ? fillTemplate(cfg.url_template, item) : '';
  // No per-job page: point at the careers page, made unique per job for dedup.
  if (!url) url = `${source.careersUrl}${source.careersUrl.includes('?') ? '&' : '?'}job=${encodeURIComponent(rawId || title)}`;

  const department = asList(f.department).map(p => valueText(getPath(item, p))).filter(Boolean).join(' / ');
  let company = valueText(getPath(item, f.company)) || source.name;
  for (const [prefix, name] of Object.entries(cfg.company_by_department_prefix || {})) {
    if (department.startsWith(prefix)) company = name;
  }
  const description = asList(f.description).map(p => valueText(getPath(item, p))).filter(Boolean).join('\n');

  return {
    id: `govt-${source.short.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${rawId || url}`,
    title: title.slice(0, 300),
    company,
    location: valueText(getPath(item, f.location)) || source.location || '',
    url,
    date: isoDay(getPath(item, f.date)),
    deadline: isoDay(getPath(item, f.deadline)),
    flags: eligibilityFlags(`${title} ${department} ${description}`),
    org: source.short,
    category: source.category,
    source: `🏛️ Govt (${source.short})`,
  };
}

function matchBrace(s, start) {
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < s.length && i - start < 500_000; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

/** Candidate records from JSON in attribute values and from a Next.js flight payload. */
export function embeddedRecords(html, cfg) {
  const records = [];
  for (const m of html.matchAll(/\s[\w:-]+\s*=\s*(["'])(\s*[{[][\s\S]*?)\1/g)) {
    try {
      const v = JSON.parse(decodeEntities(m[2]));
      records.push(...(Array.isArray(v) ? v : [v]));
    } catch { /* an ordinary attribute that happens to start with a bracket */ }
  }
  let flight = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[\d+,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try { flight += JSON.parse(m[1]); } catch { /* a malformed chunk only loses that chunk */ }
  }
  if (flight) {
    const anchor = `{"${cfg.anchor || cfg.fields.title.split('|')[0].split('.')[0]}":`;
    for (let i = flight.indexOf(anchor); i !== -1; i = flight.indexOf(anchor, i + 1)) {
      const end = matchBrace(flight, i);
      if (end === -1) continue;
      try { records.push(JSON.parse(flight.slice(i, end + 1))); } catch { /* an anchor inside a string */ }
    }
  }
  return records;
}

const CERT_ERROR_RE = /CERT|UNABLE_TO_GET_ISSUER|UNABLE_TO_VERIFY_LEAF|SELF_SIGNED|ERR_TLS_CERT/;

// Many Indian govt sites serve an incomplete certificate chain: browsers repair
// it, Node refuses it. These are public pages and nothing is sent, so on that
// specific error, retry without chain verification (same as india-govt-search).
function getInsecure(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: false, headers: { 'User-Agent': BROWSER_UA }, timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(getInsecure(new URL(res.headers.location, url).href, redirects - 1));
      }
      if (res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve(body));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function fetchText(url, init = {}) {
  try {
    const res = await fetch(url, { ...init, headers: { 'User-Agent': BROWSER_UA, ...init.headers }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (!init.method && url.startsWith('https:') && CERT_ERROR_RE.test(err.cause?.code || '')) return getInsecure(url);
    throw err;
  }
}

async function fetchSourceRecords(source) {
  const cfg = source.config;
  const url = cfg.url || source.careersUrl;
  const init = { headers: { Accept: source.kind === 'api' ? 'application/json' : 'text/html' } };
  if (cfg.method === 'POST') {
    init.method = 'POST';
    const form = new FormData();
    for (const [k, v] of Object.entries(cfg.form || {})) form.append(k, v);
    init.body = form;
  }
  const text = await fetchText(url, init);
  if (source.kind === 'embedded') return embeddedRecords(text, cfg);
  const body = JSON.parse(text);
  const list = cfg.list ? getPath(body, cfg.list) : body;
  if (!Array.isArray(list)) throw new Error(`no record list at "${cfg.list || '(root)'}"`);
  return list;
}

/** Alertable notices from a careers page (plus any extra listing pages). */
async function fetchNoticeSource(source) {
  const pages = [source.careersUrl, ...(source.extraUrls || [])];
  const byUrl = new Map();
  for (const page of pages) {
    for (const n of extractNotices(await fetchText(page), page, source)) byUrl.set(n.url, n);
  }
  // The same notice is often linked twice (English + Hindi PDF, or on both the
  // careers and the "current openings" page): keep one per title.
  const byTitle = new Map();
  for (const n of byUrl.values()) {
    if (!isAlertableNotice(n, source.relevance)) continue;
    const key = n.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!byTitle.has(key)) byTitle.set(key, n);
  }
  return [...byTitle.values()];
}

// A few sources at a time: ~140 simultaneous requests get throttled or dropped
// by the slower govt servers.
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

export function jobsFromRecords(records, source) {
  const byUrl = new Map();
  for (const r of records) {
    const job = recordToJob(r, source.config, source);
    if (job && !byUrl.has(job.url)) byUrl.set(job.url, job);
  }
  return [...byUrl.values()];
}

/**
 * Current PM-shaped govt openings across every source (feeds, embedded JSON,
 * and careers pages). Returns { jobs, failed, readOk, noticePagesRead }:
 * `failed` lists source shorts that couldn't be read (the caller keeps their
 * last-known openings); `readOk` the ones read this run; `noticePagesRead` the
 * careers-page sources among them.
 */
export async function fetchGovtOpenings() {
  const { sources } = JSON.parse(await fs.readFile(SOURCES_FILE, 'utf8'));
  const failed = [];
  const readOk = [];
  const noticePagesRead = [];
  const perSource = await mapLimited(sources, 8, async (source) => {
    try {
      let jobs;
      if (source.kind === 'notices') {
        jobs = await fetchNoticeSource(source);
      } else {
        const all = jobsFromRecords(await fetchSourceRecords(source), source);
        jobs = all.filter(j => isGovtPmTitle(j.title) && !j.flags.includes('deputation_or_govt_employees_only'));
      }
      if (jobs.length) console.log(`  Govt ${source.short}: ${jobs.length} matching`);
      readOk.push(source.short);
      if (source.kind === 'notices') noticePagesRead.push(source.short);
      return jobs;
    } catch (err) {
      console.error(`  Govt ${source.short} fetch failed: ${err.cause?.code || err.message}`);
      failed.push(source.short);
      return [];
    }
  });
  console.log(`  Govt sources: ${readOk.length} read, ${failed.length} unreachable`);
  return { jobs: perSource.flat(), failed, readOk, noticePagesRead };
}
