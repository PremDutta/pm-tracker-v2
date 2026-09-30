// Alert pacing. Instead of a message after every 6-hourly scan:
//
//   Morning digest (8:00 AM IST): everything new since the last digest, in one
//     message: new govt roles, new PM roles, govt roles closing this week, and
//     hiring signals. New jobs wait in digest-queue.json until a digest is
//     actually delivered, so nothing is lost if a channel is down.
//   Urgent, sent by any scan: a new govt role closing within 3 days, a govt
//     deadline 3 days / 1 day away (each reminder once), a reposted PM role.
//
// Dates are India time (the runner's clock is UTC).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AGENT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const QUEUE_FILE = path.join(AGENT_DIR, 'digest-queue.json');
const APP_URL = 'https://pm-tracker-v2.vercel.app';
const MAX_QUEUE = 400;
const URGENT_DAYS = 3;
const FLAG_LABELS = { age_limit_mentioned: 'age limit', mba_mentioned: 'MBA asked', contract: 'contract', corrigendum: 'corrigendum' };

export const istToday = (now = new Date()) => new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
export const daysLeft = (deadline, today) => Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
const isGovt = (j) => j.id.startsWith('govt-');

export async function loadQueue() {
  try {
    return { jobs: [], signals: [], reminders: {}, ...JSON.parse(await fs.readFile(QUEUE_FILE, 'utf8')) };
  } catch {
    return { jobs: [], signals: [], reminders: {} };
  }
}

export const saveQueue = (q) => fs.writeFile(QUEUE_FILE, JSON.stringify(q, null, 2) + '\n');

/** Adds new jobs/signals to the queue (deduped, bounded). Pure. */
export function enqueue(queue, jobs, signals, today) {
  const ids = new Set(queue.jobs.map(j => j.id));
  const keyOf = (s) => `${s.type}|${s.company}|${s.title || ''}|${s.url || s.date}`;
  const sigKeys = new Set(queue.signals.map(keyOf));
  const slim = ({ id, title, company, location, url, source, deadline, flags }) => ({ id, title, company, location, url, source, deadline, flags });
  return {
    ...queue,
    jobs: [...queue.jobs, ...jobs.filter(j => !ids.has(j.id)).map(j => ({ ...slim(j), queuedOn: today }))].slice(-MAX_QUEUE),
    signals: [...queue.signals, ...signals.filter(s => !sigKeys.has(keyOf(s)))].slice(-100),
  };
}

const groupDuplicates = (jobs) => {
  const groups = new Map();
  for (const j of jobs) {
    const key = `${j.title.toLowerCase().replace(/\s+/g, ' ').trim()}|${(j.company || '').toLowerCase()}`;
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { ...j, count: 1 });
  }
  return [...groups.values()];
};

const note = (j, today) => {
  const bits = [];
  if (j.deadline) {
    const d = daysLeft(j.deadline, today);
    bits.push(d === 0 ? 'closes TODAY' : d > 0 ? `closes in ${d}d (${j.deadline})` : `closed ${j.deadline}`);
  }
  for (const f of j.flags || []) if (FLAG_LABELS[f]) bits.push(FLAG_LABELS[f]);
  return bits.length ? `\n  ⏳ ${bits.join(' · ')}` : '';
};
const line = (j, today) => `• ${j.title} — ${j.company}${j.location ? ` (${j.location})` : ''}${j.count > 1 ? ` ×${j.count}` : ''}${note(j, today)}\n  ${j.url}`;

/**
 * What needs sending now, not at 8 AM. Pure.
 * newJobs: this scan's new jobs; openings: all open govt roles; signals: this
 * scan's new signals; reminders: { [openingId]: ['3d','1d'] } already sent.
 */
export function urgentItems({ newJobs, openings, signals, reminders, today }) {
  const closingSoon = (j) => j.deadline && daysLeft(j.deadline, today) >= 0 && daysLeft(j.deadline, today) <= URGENT_DAYS;
  const newClosing = newJobs.filter(j => isGovt(j) && closingSoon(j));
  const newIds = new Set(newClosing.map(j => j.id));
  const due = [];
  for (const o of openings) {
    if (!o.deadline || newIds.has(o.id)) continue;
    const d = daysLeft(o.deadline, today);
    const stage = d < 0 ? null : d <= 1 ? '1d' : d <= URGENT_DAYS ? '3d' : null;
    if (stage && !(reminders[o.id] || []).includes(stage)) due.push({ ...o, stage });
  }
  const reposted = signals.filter(s => s.type === 'reopened');
  return { newClosing, reminders: due, reposted };
}

export function urgentText({ newClosing, reminders, reposted }, today) {
  const parts = [];
  if (newClosing.length) parts.push(`🚨 New govt role${newClosing.length > 1 ? 's' : ''} closing within ${URGENT_DAYS} days:\n\n${newClosing.map(j => line(j, today)).join('\n\n')}`);
  if (reminders.length) parts.push(`⏰ Govt deadline reminder:\n\n${reminders.map(j => line(j, today)).join('\n\n')}`);
  if (reposted.length) parts.push(`🔁 Reposted PM role${reposted.length > 1 ? 's' : ''} (first hire fell through: move fast):\n\n${reposted.map(s => `• ${s.title} — ${s.company}\n  ${s.url}`).join('\n\n')}`);
  return parts.length ? `${parts.join('\n\n———\n\n')}\n\nLog it once you apply: ${APP_URL}` : '';
}

/** The 8 AM message; '' when there's nothing to say. Pure. */
export function digestText(queue, openings, today) {
  const govt = groupDuplicates(queue.jobs.filter(isGovt));
  const pm = groupDuplicates(queue.jobs.filter(j => !isGovt(j)));
  // Closing this week, minus roles already listed as new above (their line shows the deadline).
  const listed = new Set(queue.jobs.map(j => j.id));
  const closing = openings
    .filter(o => !listed.has(o.id) && o.deadline && daysLeft(o.deadline, today) >= 0 && daysLeft(o.deadline, today) <= 7)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const spikes = queue.signals.filter(s => s.type === 'eng_spike');
  const reposted = queue.signals.filter(s => s.type === 'reopened');
  const funding = queue.signals.filter(s => s.type === 'funding' && s.watched);
  if (!govt.length && !pm.length && !closing.length && !spikes.length && !reposted.length && !funding.length) return '';

  const section = (title, items, render, cap = 15) => items.length
    ? `${title} (${items.length})\n\n${items.slice(0, cap).map(render).join('\n\n')}${items.length > cap ? `\n\n…and ${items.length - cap} more in the app` : ''}`
    : '';
  const [y, m, d] = today.split('-');
  return [
    `☀️ PM jobs digest, ${d}/${m}/${y}`,
    section('🏛️ New govt & PSU roles', govt, j => line(j, today)),
    section('🎯 New PM roles', pm, j => line(j, today)),
    section('⏳ Govt roles closing this week', closing, j => line(j, today), 10),
    section('🔭 Hiring signals', [...reposted, ...funding, ...spikes], s =>
      s.type === 'reopened' ? `• 🔁 ${s.company}: ${s.title} reposted\n  ${s.url}`
        : s.type === 'funding' ? `• 💸 ${s.company} just raised: ${s.title}`
          : `• 📈 ${s.company}: ${s.detail}`, 8),
    `All roles, signals and deadlines: ${APP_URL}`,
  ].filter(Boolean).join('\n\n———\n\n');
}

/** Records delivered reminders and forgets ones whose deadline has passed. Pure. */
export function markReminders(reminders, sent, openings, today) {
  const next = { ...reminders };
  for (const o of sent) next[o.id] = [...new Set([...(next[o.id] || []), o.stage])];
  const live = new Map(openings.map(o => [o.id, o.deadline]));
  for (const id of Object.keys(next)) {
    const dl = live.get(id);
    if (!dl || daysLeft(dl, today) < 0) delete next[id];
  }
  return next;
}
