// Thin localStorage wrapper. Everything here is per-browser, per-device —
// there is no server, so nothing here syncs across devices or browsers.

const safeGet = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private-browsing / storage-full — silently no-op rather than crash the app
  }
};

// ─── Profile (feeds template auto-fill + watchlist mail-merge drafts) ────────
const PROFILE_KEY = 'pmt_profile';
export const getProfile = () => safeGet(PROFILE_KEY, { name: '', years: '', domain: '', achievements: ['', '', ''] });
export const setProfile = (profile) => safeSet(PROFILE_KEY, profile);

// ─── Application tracker ─────────────────────────────────────────────────────
const APPLICATIONS_KEY = 'pmt_applications';
export const APPLICATION_STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected'];

export const getApplications = () => safeGet(APPLICATIONS_KEY, []);
export const setApplications = (apps) => safeSet(APPLICATIONS_KEY, apps);

export const addApplication = (app) => {
  const apps = getApplications();
  const next = [...apps, { id: Date.now().toString(36), status: 'Applied', appliedDate: new Date().toISOString().slice(0, 10), ...app }];
  setApplications(next);
  return next;
};

export const updateApplication = (id, patch) => {
  const next = getApplications().map(a => a.id === id ? { ...a, ...patch } : a);
  setApplications(next);
  return next;
};

export const deleteApplication = (id) => {
  const next = getApplications().filter(a => a.id !== id);
  setApplications(next);
  return next;
};

// ─── Target company watchlist ────────────────────────────────────────────────
const WATCHLIST_KEY = 'pmt_watchlist';
export const getWatchlist = () => safeGet(WATCHLIST_KEY, []);
export const setWatchlist = (list) => safeSet(WATCHLIST_KEY, list);

export const addWatchlistCompany = (item) => {
  const next = [...getWatchlist(), { id: Date.now().toString(36), ...item }];
  setWatchlist(next);
  return next;
};

export const removeWatchlistCompany = (id) => {
  const next = getWatchlist().filter(w => w.id !== id);
  setWatchlist(next);
  return next;
};

// ─── Per-platform "last checked" + "was this useful" tally ──────────────────
const PLATFORM_META_KEY = 'pmt_platform_meta';
export const getPlatformMeta = () => safeGet(PLATFORM_META_KEY, {});

export const markPlatformChecked = (platformId) => {
  const meta = getPlatformMeta();
  meta[platformId] = { ...meta[platformId], lastChecked: Date.now() };
  safeSet(PLATFORM_META_KEY, meta);
  return meta;
};

export const markPlatformUseful = (platformId) => {
  const meta = getPlatformMeta();
  const prevCount = meta[platformId]?.usefulCount || 0;
  meta[platformId] = { ...meta[platformId], usefulCount: prevCount + 1 };
  safeSet(PLATFORM_META_KEY, meta);
  return meta;
};

// ─── Resume Match: the active draft + named saved versions ──────────────────
// Auto-persists whatever's in the textarea (so the tab isn't blank every
// visit) plus lets you save labeled versions (startup/enterprise/general —
// the app's own "Be First" tab already recommends keeping a few).
const RESUME_DRAFT_KEY = 'pmt_resume_draft';
export const getSavedResume = () => safeGet(RESUME_DRAFT_KEY, '');
export const setSavedResume = (text) => safeSet(RESUME_DRAFT_KEY, text);

const RESUME_VERSIONS_KEY = 'pmt_resume_versions';
export const getResumeVersions = () => safeGet(RESUME_VERSIONS_KEY, []);

export const saveResumeVersion = (label, text) => {
  const next = [...getResumeVersions(), { id: Date.now().toString(36), label, text, savedAt: new Date().toISOString().slice(0, 10) }];
  safeSet(RESUME_VERSIONS_KEY, next);
  return next;
};

export const deleteResumeVersion = (id) => {
  const next = getResumeVersions().filter(v => v.id !== id);
  safeSet(RESUME_VERSIONS_KEY, next);
  return next;
};

export const timeAgo = (timestamp) => {
  if (!timestamp) return null;
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
