// Current-role snapshots the app reads live from GitHub (raw.githubusercontent):
//   yc-roles.json   PM roles at YC startups workable from India
//   ai-roles.json   AI / ML / GenAI product roles in India (or remote-India)
// Each run rewrites the file with what's open now, keeping firstSeen per role
// so the app can mark new ones.

import fs from 'node:fs/promises';

// AI-flavoured product titles. "Data" alone is too broad (data analyst PMs at
// banks), so it only counts next to platform/science/AI words.
const AI_TITLE_RE = /\bai\b|a\.i\.|gen\s*ai|genai|\bllms?\b|machine learning|\bml\b|\bnlp\b|deep learning|computer vision|agentic|\bagents?\b|copilot|conversational|chatbot|voice ai|speech|foundation model|\bmodels?\b|inference|intelligence|data science|data platform|\bdata\s*&\s*ai\b|recommendation|personali[sz]ation/i;

export const isAiTitle = (title = '') => AI_TITLE_RE.test(title);

/** pm | senior | group | leadership, from the title. */
export function roleLevel(title = '') {
  if (/\b(head|director|vp|vice president|chief|cpo)\b/i.test(title)) return 'leadership';
  if (/\b(group|principal|staff|lead)\b/i.test(title)) return 'group';
  if (/\b(senior|sr\.?)\b/i.test(title)) return 'senior';
  return 'pm';
}

export async function saveRoleSnapshot(file, jobs, extra = {}) {
  let previous = [];
  try { previous = JSON.parse(await fs.readFile(file, 'utf8')).roles || []; } catch { /* first run */ }
  const firstSeen = new Map(previous.map(r => [r.id, r.firstSeen]));
  const today = new Date().toISOString().slice(0, 10);
  const byId = new Map();
  for (const j of jobs) {
    if (!j.id || byId.has(j.id)) continue;
    byId.set(j.id, {
      id: j.id, title: j.title, company: j.company, location: j.location || '', url: j.url, source: j.source,
      level: roleLevel(j.title),
      ...(j.eligibility && { eligibility: j.eligibility }),
      ...(j.aiMatch && { aiMatch: j.aiMatch }),
      firstSeen: firstSeen.get(j.id) || today,
    });
  }
  const roles = [...byId.values()].sort((a, b) => b.firstSeen.localeCompare(a.firstSeen) || a.company.localeCompare(b.company) || a.title.localeCompare(b.title));
  await fs.writeFile(file, JSON.stringify({ ...extra, roles }, null, 2) + '\n');
  return roles;
}
