// Location for Google search hacks ({LOC} in a query). India is multi-select
// (cities OR-ed together); abroad is one region at a time. Google ignores words
// past the 32nd, so fillLocation fits as many of the chosen cities as the query
// has room for and reports the ones it had to leave out.

export const INDIA_CITIES = [
  { id: 'delhi', label: 'Delhi', term: 'Delhi' },
  { id: 'noida', label: 'Noida', term: 'Noida' },
  { id: 'gurugram', label: 'Gurugram', term: 'Gurugram' },
  { id: 'bengaluru', label: 'Bengaluru', term: 'Bengaluru' },
  { id: 'hyderabad', label: 'Hyderabad', term: 'Hyderabad' },
  { id: 'mumbai', label: 'Mumbai', term: 'Mumbai' },
  { id: 'pune', label: 'Pune', term: 'Pune' },
  { id: 'chennai', label: 'Chennai', term: 'Chennai' },
  { id: 'remote', label: 'Remote', term: 'Remote' },
  { id: 'india', label: 'Anywhere in India', term: 'India' },
];

export const ABROAD = [
  { id: 'singapore', label: '🇸🇬 Singapore', term: 'Singapore' },
  { id: 'uae', label: '🇦🇪 UAE', term: '(Dubai OR "Abu Dhabi" OR UAE)', short: 'Dubai' },
  { id: 'saudi', label: '🇸🇦 Saudi Arabia', term: '(Riyadh OR "Saudi Arabia")', short: 'Riyadh' },
  { id: 'uk', label: '🇬🇧 UK', term: '(London OR "United Kingdom")', short: 'London' },
  { id: 'netherlands', label: '🇳🇱 Netherlands', term: '(Amsterdam OR Netherlands)', short: 'Amsterdam' },
  { id: 'germany', label: '🇩🇪 Germany', term: '(Berlin OR Munich OR Germany)', short: 'Berlin' },
  { id: 'ireland', label: '🇮🇪 Ireland', term: '(Dublin OR Ireland)', short: 'Dublin' },
  { id: 'nordics', label: '🇸🇪 Nordics', term: '(Stockholm OR Copenhagen OR Oslo)', short: 'Stockholm' },
  { id: 'us', label: '🇺🇸 US', term: '("United States" OR USA)', short: 'USA' },
  { id: 'canada', label: '🇨🇦 Canada', term: '(Toronto OR Canada)', short: 'Canada' },
  { id: 'australia', label: '🇦🇺 Australia', term: '(Sydney OR Melbourne OR Australia)', short: 'Australia' },
  { id: 'worldwide', label: '🌍 Remote worldwide', term: '(remote OR worldwide OR anywhere)', short: 'remote' },
];

export const DEFAULT_LOCATION = { mode: 'india', cities: ['delhi', 'noida', 'gurugram', 'bengaluru', 'hyderabad'], region: 'singapore' };

/** Google's word count: quotes and brackets don't add words, operators do. */
export const googleWords = (q) => q.replace(/[()]/g, ' ').replace(/"[^"]*"/g, (m) => m.slice(1, -1)).split(/\s+/).filter(Boolean).length;

/**
 * Fills {LOC}. Returns { query, dropped } where dropped lists the city labels
 * left out to keep the query within 32 words.
 */
export function fillLocation(query, loc) {
  if (!query || !query.includes('{LOC}')) return { query, dropped: [] };
  if (loc.mode === 'abroad') {
    const region = ABROAD.find(r => r.id === loc.region) || ABROAD[0];
    // Long queries get the region's one-word form ("Dubai" for UAE) to stay within 32 words.
    const fits = googleWords(query.replace(/\{LOC\}/g, region.term)) <= 32;
    return { query: query.replace(/\{LOC\}/g, fits ? region.term : (region.short || region.term)), dropped: [] };
  }
  const chosen = INDIA_CITIES.filter(c => loc.cities.includes(c.id));
  const cities = chosen.length ? chosen : INDIA_CITIES.filter(c => c.id === 'india');
  const budget = 32 - googleWords(query.replace(/\{LOC\}/g, ''));
  const kept = [];
  for (const c of cities) {
    const next = [...kept, c];
    if (googleWords(next.map(x => x.term).join(' OR ')) <= budget || kept.length === 0) kept.push(c); else break;
  }
  const term = kept.length === 1 ? kept[0].term : `(${kept.map(c => c.term).join(' OR ')})`;
  return { query: query.replace(/\{LOC\}/g, term), dropped: cities.slice(kept.length).map(c => c.label) };
}
