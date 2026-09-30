// Job feeds of large enterprises that don't use startup ATSs. Each verified
// live 2026-09-30 against real tenants; all return JSON to a plain request.
//
//   eightfold       Microsoft, Qualcomm, PayPal, Morgan Stanley
//   oracle          Oracle Recruiting Cloud: JPMorgan, Oracle, KPMG, Zensar
//   successfactors  SAP SuccessFactors career site builder: Wipro, HCLTech
//   amazon          amazon.jobs
//
// Their keyword search is loose, so each reader asks for "product manager" in
// India, reads a bounded number of pages, and the scanner filters titles.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// One retry after a pause on 429 / 5xx: these hosts throttle bursts.
async function getJson(url, init = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...init.headers }, signal: AbortSignal.timeout(30000) });
    if ((res.status === 429 || res.status >= 500) && attempt === 0) {
      await sleep(15000);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (/^\s*please try again later/i.test(text) && attempt === 0) { // Eightfold's soft throttle (HTTP 200)
      await sleep(15000);
      continue;
    }
    return JSON.parse(text);
  }
}

// Eightfold "pcsx": GET https://{host}/api/pcsx/search?domain=..&query=..&location=India&start=N
// -> { data: { count, positions: [{ id, name, locations[], positionUrl, postedTs }] } }
// Throttles bursts ("Please try again later"), hence the pause between pages.
// slug: { host, domain }
export async function fetchEightfold(company) {
  const { host, domain } = company.slug;
  const jobs = [];
  for (let start = 0; start < 80; start += 10) {
    const d = await getJson(`https://${host}/api/pcsx/search?domain=${encodeURIComponent(domain)}&query=product%20manager&location=India&start=${start}&sort_by=relevance`);
    const data = d.data || d;
    const page = data.positions || [];
    jobs.push(...page);
    if (page.length < 10 || jobs.length >= (data.count ?? 0)) break;
    await sleep(3000);
  }
  return jobs.map(p => ({
    id: `eightfold-${domain}-${p.id}`,
    title: p.name,
    company: company.name,
    location: (p.locations || []).join('; '),
    url: `https://${host}${p.positionUrl}`,
    source: `${company.name} careers`,
  }));
}

// Oracle Recruiting Cloud: GET https://{host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions
//   ?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=..,keyword=..,locationId=..,limit=25,offset=N
// -> { items: [{ TotalJobsCount, requisitionList: [{ Id, Title, PrimaryLocation, PostedDate }] }] }
// slug: { host, siteNumber, locationId } (locationId = the tenant's India location)
export async function fetchOracle(company) {
  const { host, siteNumber, locationId } = company.slug;
  const jobs = [];
  for (let offset = 0; offset < 100; offset += 25) {
    const finder = `findReqs;siteNumber=${siteNumber},facetsList=LOCATIONS,limit=25,keyword=product%20manager${locationId ? `,locationId=${locationId}` : ''},offset=${offset},sortBy=RELEVANCY`;
    const d = await getJson(`https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=${finder}`);
    const item = (d.items || [])[0] || {};
    const page = item.requisitionList || [];
    jobs.push(...page);
    if (page.length < 25 || jobs.length >= (item.TotalJobsCount ?? 0)) break;
  }
  return jobs.map(r => ({
    id: `oracle-${host}-${r.Id}`,
    title: r.Title,
    company: company.name,
    location: r.PrimaryLocation || '',
    url: `https://${host}/hcmUI/CandidateExperience/en/sites/${siteNumber}/job/${r.Id}`,
    source: `${company.name} careers`,
  }));
}

// SuccessFactors career site builder: POST https://{host}/services/recruiting/v1/jobs
// -> { totalJobs, jobSearchResult: [{ response: { id, unifiedStandardTitle, urlTitle, jobLocationShort, custprimecity } }] }
// The keyword barely filters (thousands of hits), so only the first pages by
// relevance are read. slug: { host, location?, countryFacet? }
export async function fetchSuccessFactors(company) {
  const { host, location = '', countryFacet } = company.slug;
  const jobs = [];
  for (let pageNumber = 0; pageNumber < 6; pageNumber++) {
    const d = await getJson(`https://${host}/services/recruiting/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locale: 'en_US', pageNumber, sortBy: '', keywords: 'product manager', location,
        facetFilters: countryFacet ? { custCountryRegion: [countryFacet] } : {},
        brand: '', skills: [], categoryId: 0, alertId: '', rcmCandidateId: '',
      }),
    });
    const page = (d.jobSearchResult || []).map(r => r.response || {});
    jobs.push(...page);
    if (page.length < 10) break;
  }
  return jobs.map(r => ({
    id: `sf-${host}-${r.id}`,
    title: r.unifiedStandardTitle || r.urlTitle || '',
    company: company.name,
    location: [].concat(r.jobLocationShort || r.custprimecity || []).join('; ') || 'India',
    url: `https://${host}/job/${r.urlTitle || r.unifiedUrlTitle}/${r.id}-en_US/`,
    source: `${company.name} careers`,
  }));
}

// amazon.jobs: GET https://www.amazon.jobs/en/search.json?base_query=..&country=IND&result_limit=100&offset=N
// -> { hits, jobs: [{ id_icims, title, normalized_location, job_path }] }
export async function fetchAmazon(company) {
  const jobs = [];
  for (let offset = 0; offset < 300; offset += 100) {
    const d = await getJson(`https://www.amazon.jobs/en/search.json?base_query=product%20manager&country=IND&result_limit=100&offset=${offset}`);
    jobs.push(...(d.jobs || []));
    if ((d.jobs || []).length < 100 || jobs.length >= (d.hits ?? 0)) break;
  }
  return jobs.map(j => ({
    id: `amazon-${j.id_icims}`,
    title: j.title,
    company: company.name,
    location: j.normalized_location || '',
    url: `https://www.amazon.jobs${j.job_path}`,
    source: 'Amazon careers',
  }));
}
