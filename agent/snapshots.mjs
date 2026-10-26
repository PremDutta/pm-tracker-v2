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
      ...(j.regions && { regions: j.regions }),
      firstSeen: firstSeen.get(j.id) || today,
    });
  }
  const roles = [...byId.values()].sort((a, b) => b.firstSeen.localeCompare(a.firstSeen) || a.company.localeCompare(b.company) || a.title.localeCompare(b.title));
  await fs.writeFile(file, JSON.stringify({ ...extra, roles }, null, 2) + '\n');
  return roles;
}

// Regions for PM roles abroad (Global tab). Country codes are matched
// case-sensitively so "in"/"us" as words don't count.
const REGIONS = [
  ['singapore', /singapore/i, /\bSG\b/],
  ['uae', /dubai|abu dhabi|sharjah|united arab emirates/i, /\bUAE\b/],
  ['saudi', /riyadh|jeddah|dammam|saudi/i, /\bKSA\b/],
  ['uk', /london|manchester|edinburgh|united kingdom|england/i, /\bUK\b|\bGB\b/],
  ['netherlands', /amsterdam|rotterdam|utrecht|eindhoven|the hague|netherlands/i, /\bNL\b/],
  ['germany', /berlin|munich|hamburg|frankfurt|cologne|germany/i, /\bDE\b/],
  ['ireland', /dublin|cork|ireland/i, /\bIE\b/],
  ['nordics', /stockholm|copenhagen|oslo|helsinki|tallinn|sweden|denmark|norway|finland|estonia/i, /\bSE\b|\bDK\b/],
  ['europe', /berlin|munich|amsterdam|paris|dublin|madrid|barcelona|lisbon|stockholm|zurich|warsaw|prague|copenhagen|tallinn|europe|netherlands|germany|france|spain|ireland|poland|portugal|switzerland|sweden|estonia/i, /\bEU\b|\bEMEA\b/],
  ['us', /united states|new york|san francisco|seattle|austin|boston|chicago|los angeles|bay area|palo alto|mountain view/i, /\bUSA?\b|,\s*(CA|NY|WA|TX|MA|IL)\b/],
  ['canada', /canada|toronto|vancouver|montreal/i, /\bCAN\b/],
  ['australia', /australia|sydney|melbourne/i, /\bAUS?\b/],
  ['apac', /tokyo|japan|hong kong|jakarta|indonesia|malaysia|kuala lumpur|bangkok|thailand|vietnam|manila|philippines|seoul|korea/i, /\bHK\b|\bJP\b/],
];

/** Regions a location names (a role can be in several), or [] for none / India-only. */
export const regionsOf = (location = '') =>
  REGIONS.filter(([, words, codes]) => words.test(location) || codes.test(location)).map(([id]) => id);
