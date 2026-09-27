// Funding-news signal: a company that just raised usually hires PMs within 1-3
// months. Reads three Indian startup-news RSS feeds (verified live 2026-09-27)
// and turns "X raises $Y..." headlines into `funding` signals for the app's
// Signals tab. Company names come from the headline, so they're best-effort.

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const FUNDING_FEEDS = [
  { name: 'Entrackr', url: 'https://entrackr.com/rss' },
  { name: 'YourStory', url: 'https://yourstory.com/category/funding/feed' },
  { name: 'Inc42', url: 'https://inc42.com/feed/' },
];

// Not a startup raising: IPOs, anchor books, weekly roundups, fund launches.
const SKIP_RE = /\bipo\b|anchor|roundup|this week|funding galore|\bfunds?\b|\bto raise\b|report|tracxn|data shows|\bdeal\b|contract|\border\b|licen[cs]e|\bipa\b|approval|enters/i;
// A funding headline names money or a round; "secures IPA" or "lands a deal" don't.
const MONEY_RE = /\$|₹|\brs\.?\s*\d|crore|\bcr\b|\bmn\b|million|\bbn\b|billion|seed|series|round|funding|valuation/i;
const RAISE_RE = /^(?:exclusive:\s*)?(?<co>.+?)(?:\s*\((?:formerly|fka)[^)]*\))?\s+(?:raises|raised|bags|secures|gets|lands|closes|nets|picks up|is raising|in talks to raise)\b/i;
const LEADS_RE = /(?:leads|led)\s+(?:\$[\d.]+\s*(?:mn|m|k|bn|cr)\s+)?(?:[\w-]+\s)*?round\s+in\s+(?<co>[A-Z][\w.&'’ -]{1,40})$/i;

// "Enterprise AI startup Ema" -> "Ema"; "preventive pain care brand betterhood"
// -> "betterhood". Descriptor words run up to a startup/brand/platform noun.
// Greedy, so "Fintech and brokerage startup Definedge" strips through "startup".
const DESCRIPTOR_RE = /^.*\b(?:startup|start-up|platform|brand|company|firm|maker|manufacturer|marketplace|app|provider|player|unicorn|fintech|edtech|healthtech|agritech|saas|lender|nbfc|retailer|chain|operator|developer)\s+/i;

export function companyFromHeadline(title) {
  const t = title.replace(/\s+/g, ' ').trim();
  if (SKIP_RE.test(t) || !MONEY_RE.test(t)) return null;
  let co = RAISE_RE.exec(t)?.groups?.co || LEADS_RE.exec(t)?.groups?.co;
  if (!co) return null;
  co = co.replace(DESCRIPTOR_RE, '').replace(/^(?:exclusive:\s*)/i, '')
    .replace(/['’]s\s+(?:indian|india)\s+(?:entity|arm|unit|subsidiary|business)$/i, '').trim();
  if (!co || co.length > 40 || co.split(' ').length > 5) return null;
  return co;
}

const rssField = (item, tag) => {
  const m = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/&#8216;|&lsquo;/g, '‘').replace(/&#038;/g, '&').trim() : '';
};

export function fundingItems(xml, feedName) {
  const out = [];
  for (const item of xml.match(/<item\b[\s\S]*?<\/item>/gi) || []) {
    const title = rssField(item, 'title');
    const company = title && companyFromHeadline(title);
    if (!company) continue;
    const pub = Date.parse(rssField(item, 'pubDate'));
    out.push({
      type: 'funding',
      company,
      title,
      url: rssField(item, 'link'),
      date: Number.isNaN(pub) ? new Date().toISOString().slice(0, 10) : new Date(pub).toISOString().slice(0, 10),
      detail: `via ${feedName}`,
    });
  }
  return out;
}

/** Funding signals across the feeds, one per company (first headline wins). */
export async function fetchFundingSignals() {
  const perFeed = await Promise.all(FUNDING_FEEDS.map(async (feed) => {
    try {
      const res = await fetch(feed.url, { headers: { 'User-Agent': BROWSER_UA }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = fundingItems(await res.text(), feed.name);
      console.log(`  Funding ${feed.name}: ${items.length} raises`);
      return items;
    } catch (err) {
      console.error(`  Funding ${feed.name} fetch failed: ${err.cause?.code || err.message}`);
      return [];
    }
  }));
  const byCompany = new Map();
  for (const s of perFeed.flat()) {
    const key = s.company.toLowerCase();
    if (!byCompany.has(key)) byCompany.set(key, s);
  }
  return [...byCompany.values()];
}
