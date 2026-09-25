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
// Most PSUs only publish PDF notices; those aren't read here. They're covered by
// the app's Govt & PSU tab (7-day "last checked" tracking) and the digest.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function fetchSourceRecords(source) {
  const cfg = source.config;
  const url = cfg.url || source.careersUrl;
  const init = { headers: { 'User-Agent': BROWSER_UA, Accept: source.kind === 'api' ? 'application/json' : 'text/html' }, signal: AbortSignal.timeout(30000) };
  if (cfg.method === 'POST') {
    init.method = 'POST';
    const form = new FormData();
    for (const [k, v] of Object.entries(cfg.form || {})) form.append(k, v);
    init.body = form;
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (source.kind === 'embedded') return embeddedRecords(await res.text(), cfg);
  const body = await res.json();
  const list = cfg.list ? getPath(body, cfg.list) : body;
  if (!Array.isArray(list)) throw new Error(`no record list at "${cfg.list || '(root)'}"`);
  return list;
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
 * Current PM-shaped govt openings across every structured source.
 * Returns { jobs, failed } - `failed` lists source shorts that couldn't be read,
 * so the caller can keep their last-known openings instead of dropping them.
 */
export async function fetchGovtOpenings() {
  const { sources } = JSON.parse(await fs.readFile(SOURCES_FILE, 'utf8'));
  const failed = [];
  const perSource = await Promise.all(sources.map(async (source) => {
    try {
      const all = jobsFromRecords(await fetchSourceRecords(source), source);
      const pm = all.filter(j => isGovtPmTitle(j.title) && !j.flags.includes('deputation_or_govt_employees_only'));
      console.log(`  Govt ${source.short}: ${all.length} openings, ${pm.length} product roles`);
      return pm;
    } catch (err) {
      console.error(`  Govt ${source.short} fetch failed: ${err.message}`);
      failed.push(source.short);
      return [];
    }
  }));
  return { jobs: perSource.flat(), failed };
}
