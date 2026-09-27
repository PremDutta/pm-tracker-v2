// Hiring signals from the company job boards the scanner already reads:
//
//   reopened     A PM title that had disappeared from a company's board is back
//                under a new posting. The first hire fell through or the role
//                was re-scoped: they're motivated and moving fast.
//   eng_spike    A company's engineering openings jumped well above its recent
//                norm. New product lines get engineers first, PMs next.
//   funding      (added by funding.mjs) the company just raised.
//
// State lives in ats-history.json (one snapshot per company per day), signals
// in signals.json, which the app's Signals tab reads live from GitHub.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AGENT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const HISTORY_FILE = path.join(AGENT_DIR, 'ats-history.json');
export const SIGNALS_FILE = path.join(AGENT_DIR, 'signals.json');

const ENG_RE = /engineer|developer|\bsde\b|software|back-?end|front-?end|full[\s-]?stack|devops|\bsre\b|machine learning|\bml\b|android|\bios\b|\bqa\b|architect/i;
const HISTORY_DAYS = 30;
const SIGNAL_DAYS = 30;
const REOPEN_WINDOW_DAYS = 90;

// Parentheses usually hold a location or req id ("(Bengaluru)", "(R-1234)"); the rest
// of the title distinguishes roles ("PM - Payments" vs "PM - Growth").
export const normTitle = (t) => t.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const dayOffset = (isoDay, days) => new Date(Date.parse(`${isoDay}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

/**
 * Pure core, exported for tests. `boards` = [{ company, jobs: [{ id, title, url }] }]
 * for the companies read successfully this run; `isPm` picks PM postings.
 * Returns { history, newSignals }.
 */
export function computeSignals(history, boards, isPm, today) {
  const companies = { ...(history.companies || {}) };
  const newSignals = [];

  for (const { company, jobs } of boards) {
    const prev = companies[company] || { daily: {}, pm: {} };
    const daily = { ...prev.daily };
    const pm = { ...prev.pm };

    // Engineering spike: today vs the median of earlier days (needs 5+ days).
    const eng = jobs.filter(j => ENG_RE.test(j.title)).length;
    const earlier = Object.entries(daily).filter(([d]) => d < today).map(([, v]) => v.eng);
    const base = median(earlier);
    const alreadyFlagged = daily[today]?.spike;
    const spike = earlier.length >= 5 && eng >= Math.max(base * 1.5, base + 5);
    daily[today] = { total: jobs.length, eng, ...(spike || alreadyFlagged ? { spike: true } : {}) };
    if (spike && !alreadyFlagged) {
      newSignals.push({ type: 'eng_spike', company, date: today, detail: `${eng} engineering openings vs a usual ${Math.round(base)}` });
    }

    // Reopened PM roles: a title that was closed (absent on an earlier run)
    // comes back under an id we haven't seen for it.
    const openNow = new Map();
    for (const j of jobs.filter(j => isPm(j.title))) {
      const key = normTitle(j.title);
      if (!openNow.has(key)) openNow.set(key, j);
    }
    for (const [key, j] of openNow) {
      const rec = pm[key];
      if (rec?.closedOn && !rec.ids.includes(j.id) && rec.closedOn >= dayOffset(today, -REOPEN_WINDOW_DAYS)) {
        newSignals.push({ type: 'reopened', company, date: today, title: j.title, url: j.url, id: j.id, detail: `closed ${rec.closedOn}, reposted today` });
      }
      pm[key] = { ids: [...new Set([...(rec?.ids || []), j.id])].slice(-10), lastSeen: today };
    }
    for (const [key, rec] of Object.entries(pm)) {
      if (!openNow.has(key) && !rec.closedOn) pm[key] = { ...rec, closedOn: today };
    }

    // Bounded history.
    const cutoff = dayOffset(today, -HISTORY_DAYS);
    companies[company] = {
      daily: Object.fromEntries(Object.entries(daily).filter(([d]) => d >= cutoff).sort()),
      pm: Object.fromEntries(Object.entries(pm).filter(([, r]) => (r.closedOn || r.lastSeen) >= dayOffset(today, -REOPEN_WINDOW_DAYS))),
    };
  }
  return { history: { companies }, newSignals };
}

/** Appends signals (deduped), drops ones older than SIGNAL_DAYS, writes the file. */
export async function saveSignals(newSignals, today) {
  const existing = (await readJson(SIGNALS_FILE, { signals: [] })).signals || [];
  const key = (s) => `${s.type}|${s.company}|${s.title || ''}|${s.id || s.url || s.date}`;
  const seen = new Set(existing.map(key));
  const cutoff = dayOffset(today, -SIGNAL_DAYS);
  const signals = [...existing, ...newSignals.filter(s => !seen.has(key(s)))]
    .filter(s => s.date >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date) || a.company.localeCompare(b.company));
  await fs.writeFile(SIGNALS_FILE, JSON.stringify({ signals }, null, 2) + '\n');
}

export async function updateAtsSignals(boards, isPm, today = new Date().toISOString().slice(0, 10)) {
  const { history, newSignals } = computeSignals(await readJson(HISTORY_FILE, { companies: {} }), boards, isPm, today);
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2) + '\n');
  return newSignals;
}
