import { GOOGLE_HACKS } from './googleHacks';
import { ROLES, fillRole } from './roles';
import { fillLocation, googleWords, INDIA_CITIES, ABROAD, DEFAULT_LOCATION } from './location';

// Every place a user can search: all India cities at once (worst case), the
// default, and each region abroad.
const LOCATIONS = [
  { ...DEFAULT_LOCATION, cities: INDIA_CITIES.map(c => c.id) },
  DEFAULT_LOCATION,
  ...ABROAD.map(r => ({ mode: 'abroad', region: r.id, cities: [] })),
];

test('every hack stays within Google\'s 32-word limit for every role and location', () => {
  for (const role of ROLES) for (const loc of LOCATIONS) for (const h of GOOGLE_HACKS) {
    const { query } = fillLocation(fillRole(h.query, role), loc);
    expect([h.id, role.label, loc.region, googleWords(query) <= 32]).toEqual([h.id, role.label, loc.region, true]);
    expect(query).not.toMatch(/\{(LOC|ROLE|KW)/);
  }
});

test('India cities are OR-ed; cities that would break the limit are reported, not silently dropped', () => {
  const loc = { mode: 'india', cities: ['noida', 'gurugram', 'delhi'] };
  expect(fillLocation('{ROLE} {LOC} jobs', loc).query).toBe('{ROLE} (Delhi OR Noida OR Gurugram) jobs');
  const all = { mode: 'india', cities: INDIA_CITIES.map(c => c.id) };
  const sweep = GOOGLE_HACKS.find(h => h.id === 'ats-sweep-startup');
  const { query, dropped } = fillLocation(fillRole(sweep.query, ROLES[1]), all);
  expect(googleWords(query)).toBeLessThanOrEqual(32);
  expect(dropped.length).toBeGreaterThan(0);
  expect(fillLocation('x {LOC}', { mode: 'abroad', region: 'uae' }).query).toBe('x (Dubai OR "Abu Dhabi" OR UAE)');
});

test('hack ids are unique and every ATS card searches for the selected role', () => {
  expect(new Set(GOOGLE_HACKS.map(h => h.id)).size).toBe(GOOGLE_HACKS.length);
  for (const h of GOOGLE_HACKS.filter(h => h.category === 'ats')) expect(h.query).toContain('{ROLE}');
});
