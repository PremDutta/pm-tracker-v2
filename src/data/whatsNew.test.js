import { isNew, recentFeatures, NEW_FOR_DAYS, WHATS_NEW } from './whatsNew';

test('NEW badges expire NEW_FOR_DAYS after launch', () => {
  const at = (d) => new Date(`${d}T12:00:00`);
  expect(isNew('tab:signals', at('2026-09-27'))).toBe(true);
  expect(isNew('tab:signals', at('2026-10-11'))).toBe(true);   // day 14
  expect(isNew('tab:signals', at('2026-10-12'))).toBe(false);  // day 15
  expect(isNew('tab:tracker', at('2026-09-27'))).toBe(false);  // shipped 2026-09-04
  expect(isNew('no-such-feature', at('2026-09-27'))).toBe(false);
  expect(NEW_FOR_DAYS).toBe(14);
});

test("What's new lists only headline entries still in the window, newest first", () => {
  const list = recentFeatures(new Date('2026-09-28T12:00:00'));
  expect(list.every(f => f.desc)).toBe(true);
  expect(list.map(f => f.date)).toEqual([...list.map(f => f.date)].sort().reverse());
  expect(list.find(f => f.id === 'tab:tracker')).toBeUndefined();
  expect(new Set(WHATS_NEW.map(f => f.id)).size).toBe(WHATS_NEW.length);
});
