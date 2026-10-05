// LinkedIn's newer search page (/jobs/search-results/) seen in its own job-alert
// links (2026-10). Two undocumented-but-working parameters:
//   keywords=<natural language>  semantic search: "senior product manager AI,
//                                on-site or remote or hybrid" is understood as-is
//   f_TPR=a<unix seconds>-       posted AFTER that moment (an absolute cutoff,
//                                unlike the classic f_TPR=r<seconds> window)
// geoId 102713980 = India. Undocumented, so the classic /jobs/search/ link in
// platforms.js stays as the fallback.

const BASE = 'https://www.linkedin.com/jobs/search-results/';
const INDIA_GEO = '102713980';
const MAX_LOOKBACK_DAYS = 30;

const url = (params) => `${BASE}?${new URLSearchParams({ geoId: INDIA_GEO, ...params }).toString()}`;

/** Semantic query for the selected role, optionally AI-focused. */
export const semanticQuery = (role, { ai = false } = {}) =>
  `${role.keyword}${ai ? ' AI, GenAI or ML' : ''} jobs, on-site or remote or hybrid`;

/**
 * Jobs posted since `sinceMs` (your last LinkedIn check from this app). Falls
 * back to the past 24 hours if never checked, and caps the look-back at 30 days.
 */
export function linkedinSinceUrl(role, sinceMs, nowMs = Date.now()) {
  const floor = nowMs - MAX_LOOKBACK_DAYS * 86_400_000;
  const params = { keywords: semanticQuery(role) };
  if (sinceMs) params.f_TPR = `a${Math.floor(Math.max(sinceMs, floor) / 1000)}-`;
  else params.f_TPR = 'r86400';
  return url(params);
}

export const linkedinSemanticUrl = (role, opts) => url({ keywords: semanticQuery(role, opts) });
