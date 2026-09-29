import { GOOGLE_HACKS } from './googleHacks';
import { ROLES, fillRole } from './roles';

// Google silently ignores everything after a query's 32nd word, so a long
// OR-list can quietly lose its location or role terms.
const googleWords = (q) => q.replace(/[()]/g, ' ').replace(/"[^"]*"/g, m => m.slice(1, -1)).split(/\s+/).filter(Boolean).length;

test('every hack stays within Google\'s 32-word limit for both PM and Senior PM', () => {
  for (const role of ROLES) {
    for (const h of GOOGLE_HACKS) {
      const n = googleWords(fillRole(h.query, role));
      expect([h.id, role.label, n <= 32]).toEqual([h.id, role.label, true]);
    }
  }
});

test('hack ids are unique and every ATS card searches for the selected role', () => {
  expect(new Set(GOOGLE_HACKS.map(h => h.id)).size).toBe(GOOGLE_HACKS.length);
  for (const h of GOOGLE_HACKS.filter(h => h.category === 'ats')) expect(h.query).toContain('{ROLE}');
});
