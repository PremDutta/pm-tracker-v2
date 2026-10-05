import { linkedinSinceUrl, linkedinSemanticUrl, semanticQuery } from './linkedin';

const role = { keyword: 'Senior Product Manager' };
const params = (u) => Object.fromEntries(new URL(u).searchParams);

test('since-last-check uses LinkedIn\'s absolute f_TPR=a<unix>- cutoff, capped at 30 days', () => {
  const now = Date.parse('2026-10-06T10:00:00Z');
  const p = params(linkedinSinceUrl(role, Date.parse('2026-10-04T18:06:30Z'), now));
  expect(new URL(linkedinSinceUrl(role, now, now)).pathname).toBe('/jobs/search-results/');
  expect(p.f_TPR).toBe('a1791137190-');                 // the same value LinkedIn's own alert used
  expect(p.geoId).toBe('102713980');
  expect(p.keywords).toBe('Senior Product Manager jobs, on-site or remote or hybrid');
  expect(params(linkedinSinceUrl(role, Date.parse('2026-01-01T00:00:00Z'), now)).f_TPR)
    .toBe(`a${Math.floor((now - 30 * 86_400_000) / 1000)}-`);
  expect(params(linkedinSinceUrl(role, null, now)).f_TPR).toBe('r86400');   // never checked: past 24h
});

test('semantic search query follows the role, with an AI variant', () => {
  expect(semanticQuery(role, { ai: true })).toBe('Senior Product Manager AI, GenAI or ML jobs, on-site or remote or hybrid');
  expect(params(linkedinSemanticUrl(role, { ai: true })).keywords).toContain('AI, GenAI or ML');
  expect(params(linkedinSemanticUrl(role)).f_TPR).toBeUndefined();
});
