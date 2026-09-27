// VC portfolio job boards: one board lists every open role across a fund's
// portfolio, often roles that aren't on LinkedIn or Naukri. Verified live
// 2026-09-27:
//   Getro    (Accel):               POST https://api.getro.com/api/v2/collections/{id}/search/jobs
//   Consider (Peak XV, Lightspeed): GET {host}/jobs for the session cookie + csrfToken,
//                                   then POST {host}/api-boards/search-jobs
// Only PM-titled roles located in India (or remote-India) are kept.

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_PAGES = 10;

export const VC_BOARDS = [
  { key: 'accel', name: 'Accel', kind: 'getro', collection: 8672 },
  { key: 'peakxv', name: 'Peak XV', kind: 'consider', host: 'https://careers.peakxv.com', board: 'sequoia-capital-india' },
  { key: 'lightspeed', name: 'Lightspeed', kind: 'consider', host: 'https://jobs.lsvp.com', board: 'lightspeed' },
];

const inIndia = (locations) => (locations || []).some(l => /india|bengaluru|bangalore|mumbai|delhi|gurgaon|gurugram|noida|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur/i.test(typeof l === 'string' ? l : JSON.stringify(l)));

async function fetchGetro(board, isPm) {
  const jobs = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(`https://api.getro.com/api/v2/collections/${board.collection}/search/jobs`, {
      method: 'POST',
      // Getro answers 406 without an explicit JSON Accept header.
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': BROWSER_UA },
      body: JSON.stringify({ hitsPerPage: 20, page, filters: { searchable_locations: ['India'] }, query: 'product manager' }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const hits = data.results?.jobs || [];
    jobs.push(...hits);
    if (hits.length < 20 || jobs.length >= (data.results?.count ?? 0)) break;
  }
  return jobs.filter(j => isPm(j.title || '')).map(j => ({
    id: `vc-${board.key}-${j.id}`,
    title: j.title,
    company: j.organization?.name || 'Unknown',
    location: (j.locations || []).join(', '),
    url: j.url,
    source: `VC board (${board.name} portfolio)`,
  }));
}

async function fetchConsider(board, isPm) {
  const page = await fetch(`${board.host}/jobs`, { headers: { 'User-Agent': BROWSER_UA }, signal: AbortSignal.timeout(30000) });
  if (!page.ok) throw new Error(`HTTP ${page.status} on /jobs`);
  const html = await page.text();
  const csrf = /"csrfToken":"([^"]+)"/.exec(html)?.[1];
  if (!csrf) throw new Error('no csrfToken on /jobs');
  const cookie = (page.headers.getSetCookie?.() || [page.headers.get('set-cookie') || ''])
    .map(c => c.split(';')[0]).filter(Boolean).join('; ');

  const jobs = [];
  let sequence;
  for (let i = 0; i < MAX_PAGES; i++) {
    const res = await fetch(`${board.host}/api-boards/search-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA, 'x-csrf-token': csrf, cookie },
      body: JSON.stringify({ meta: { size: 50, ...(sequence && { sequence }) }, board: { id: board.board, isParent: true }, query: { titlePrefix: 'product manager' }, grouped: false }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const batch = data.jobs || [];
    jobs.push(...batch);
    sequence = data.meta?.sequence;
    if (batch.length < 50 || !sequence) break;
  }
  return jobs.filter(j => isPm(j.title || '') && inIndia(j.locations)).map(j => ({
    id: `vc-${board.key}-${j.jobId}`,
    title: j.title,
    company: j.companyName || 'Unknown',
    location: (j.locations || []).join(', '),
    url: j.url,
    source: `VC board (${board.name} portfolio)`,
  }));
}

/** PM roles in India across the VC boards. Returns { jobs, readOk } (board keys read). */
export async function fetchVcBoards(isPm) {
  const readOk = [];
  const results = await Promise.all(VC_BOARDS.map(async (board) => {
    try {
      const jobs = board.kind === 'getro' ? await fetchGetro(board, isPm) : await fetchConsider(board, isPm);
      readOk.push(board.key);
      console.log(`  VC ${board.name}: ${jobs.length} PM roles in India`);
      return jobs.map(j => ({ ...j, baselineKey: `vc:${board.key}` }));
    } catch (err) {
      console.error(`  VC ${board.name} fetch failed: ${err.cause?.code || err.message}`);
      return [];
    }
  }));
  // The same role often sits on two funds' boards (co-investments): keep one.
  const byUrl = new Map();
  for (const j of results.flat()) if (j.url && !byUrl.has(j.url)) byUrl.set(j.url, j);
  return { jobs: [...byUrl.values()], readOk: readOk.map(k => `vc:${k}`) };
}
