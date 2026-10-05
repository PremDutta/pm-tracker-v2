// Y Combinator startups' PM roles that you can do from India: based in India,
// or remote with India allowed. Verified live 2026-10-05.
//
// ycombinator.com/jobs pages are server-rendered with the listing as JSON in
// the root element's data-page attribute (props.jobPostings: [{ id, title,
// url, location, role, companyName }]). Each page shows only its latest ~38
// jobs and ?page= is ignored, so several views are unioned; scanning every 6
// hours catches roles as they're posted.
//
// Location strings look like "Bengaluru, KA, IN", "IN / Remote (IN)",
// "Remote", "Remote (US)", "ID / MY / IN / Remote (ID; MY; IN)".

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const VIEWS = ['role/product-manager', 'role/product-manager/remote', 'role/product-manager/india', 'location/india', 'location/remote', 'location/bangalore'];

const decodeAttr = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function jobsFromYcPage(html) {
  const m = /data-page="([^"]+)"/.exec(html);
  if (!m) return [];
  try {
    return JSON.parse(decodeAttr(m[1])).props?.jobPostings || [];
  } catch {
    return [];
  }
}

// The country code is matched case-sensitively: /\bIN\b/i would also match the word "in".
const IN_INDIA = { test: (s) => /\bIN\b/.test(s) || /india|bengaluru|bangalore|hyderabad|delhi|gurgaon|gurugram|noida|mumbai|pune|chennai|kolkata/i.test(s) };

// Places that make a bare "Remote" mean "remote within that country/region".
const FOREIGN = /\b(US|USA|U\.S\.|United States|America|UK|United Kingdom|Europe|EU|EMEA|LATAM|APAC only|Canada|Germany|France|Spain|Netherlands|Ireland|Brazil|Mexico|Singapore|Australia|Japan|Israel|Washington|San Francisco|SF|New York|NYC|London|Berlin|Toronto|Seattle|Austin|Boston|Chicago|Paris|Dublin|Amsterdam|Los Angeles|Bay Area)\b|,\s*(CA|NY|WA|TX|MA|IL)\b/i;

/** 'india' | 'remote' | null: whether someone in India can take the role. */
export function indiaEligibility(location = '') {
  const scoped = [...location.matchAll(/remote[\w-]*\s*\(([^)]*)\)/gi)].map(m => m[1]);
  const bare = location.replace(/remote[\w-]*\s*\([^)]*\)/gi, ' ');
  if (IN_INDIA.test(bare) || scoped.some(sc => /\bIN\b/.test(sc) || /india/i.test(sc))) return 'india';
  // "Remote (Anywhere)", or a bare "Remote" that isn't tied to another country.
  if (scoped.some(sc => /anywhere|global|worldwide/i.test(sc))) return 'remote';
  if (/remote/i.test(bare) && !FOREIGN.test(bare)) return 'remote';
  return null;
}

/** PM roles at YC startups workable from India. Returns { jobs, ok }. */
export async function fetchYcJobs(isPm) {
  const byId = new Map();
  let ok = 0;
  for (const view of VIEWS) {
    try {
      const res = await fetch(`https://www.ycombinator.com/jobs/${view}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      for (const j of jobsFromYcPage(await res.text())) byId.set(j.id, j);
      ok++;
    } catch (err) {
      console.error(`  YC ${view} fetch failed: ${err.cause?.code || err.message}`);
    }
  }
  const jobs = [...byId.values()]
    .filter(j => isPm(j.title || '') && indiaEligibility(j.location))
    .map(j => ({
      id: `yc-${j.id}`,
      title: j.title,
      company: j.companyName || 'YC startup',
      location: j.location || '',
      url: `https://www.ycombinator.com${j.url}`,
      source: 'Y Combinator (Work at a Startup)',
      eligibility: indiaEligibility(j.location),
      baselineKey: 'yc',
    }));
  console.log(`  YC: ${byId.size} jobs across ${ok}/${VIEWS.length} views, ${jobs.length} PM roles open to India`);
  return { jobs, ok: ok > 0 };
}
