// Openings on govt careers pages that have no job feed: most PSUs, PSU banks and
// ministries publish a page of notice links (often PDFs, often labelled just
// "Click here"). This reads each page's links and keeps the ones that look like
// a live opening. Port of india-govt-search's cli/src/extract.ts, so the scanner
// and the ai-job-search digest agree on what counts as a notice.

import crypto from 'node:crypto';
import { decodeEntities, eligibilityFlags, FRESHER_RE } from './govt.mjs';

const PDF_URL_RE = /\.pdf(\?|$)/i;

// A link is a candidate notice when its text or its row says so.
const NOTICE_RE =
  /recruit|vacanc|advertis|\badvt\b|\badv\.|hiring|engagement\s+of|walk[\s-]*in|openings?|lateral|on\s+contract|contract(ual)?\s+basis|deputation|consultants?\b|\bmanager|specialist|\bexpert|professionals?\b|\bofficers?\b|executives?\b|\bhead\b|director|\blead\b|analyst|application|notification|empanelment\s+of\s+(individual|expert|consultant)|positions?\b|posts?\s+of|\bjobs?\b|careers?\b|selection/i;

// About something other than an opening (checked on link text and its row).
const NOT_A_NOTICE_RE =
  /\btenders?\b|e-?procurement|\bauction|\bnit\b|\brfp\b|\beoi\b\s+for\s+(selection\s+of\s+)?(agenc|vendor|firm|compan)|pre-?bid|bid\s+(number|document)|\bgem\s*\/\s*\d|admit\s*card|call\s*letter|answer\s*key|\bresults?\b|merit\s*list|marks\s+obtained|cut[\s-]*off|\brti\b|annual\s+report|press\s+release|photo\s+gallery|\bsitemap\b|privacy\s+policy|disclaimer|terms\s+(of|and)\s+use|screen\s+reader|skip\s+to\s+main|feedback|contact\s+us|\bfaqs?\b|holiday\s+list/i;

const GENERIC_LINK_TEXT_RE =
  /^(click\s+here|here|download|view|view\s+details?|details?|more|read\s+more|apply(\s+now|\s+online)?|link|pdf|notice|advertisement|english|hindi|\(?\d+(\.\d+)?\s*(kb|mb)\)?)$/i;

const PRODUCT_RE = /\bproduct\b/i;
const DIGITAL_RE =
  /digital|\bit\b|i\.t\.|information\s+technology|technolog|software|\bdata\b|analytics|\bai\b|artificial\s+intelligence|machine\s+learning|e-?gov|\bcto\b|\bcio\b|cyber|platform|fintech|payments?|\bux\b|\bdesign\b|innovation|startup/i;
const MANAGEMENT_RE =
  /manager|\bhead\b|director|\blead\b|chief|general\s+manager|\bgm\b|\bagm\b|\bdgm\b|consultant|expert|specialist|programme|program|project|strategy|business\s+development|marketing|officer\s*\(\s*(it|digital)/i;

export function roleMatch(text) {
  if (PRODUCT_RE.test(text) && !/product\s+(marketing|design)/i.test(text)) return 'product';
  if (DIGITAL_RE.test(text)) return 'digital_it';
  if (MANAGEMENT_RE.test(text)) return 'management';
  return 'general';
}

// Recruitments already past applications: shortlists, interview logistics, closures.
const OUTCOME_RE =
  /short[\s_-]*list(ed)?|select(ion)?\s+list|(list|details?|names?)\s+of\s+(the\s+)?(provisionally\s+)?(selected|shortlisted|short\s+listed|successful|qualified|recommended)|provisionally\s+(selected|shortlisted|empanell?ed)|selected\s+(candidates|applicants)|candidates\s+(provisionally\s+)?(selected|called|scheduled|recommended)|called\s+for\s+(the\s+)?(interview|selection|document|written|skill|computer)|interview\s+schedule|schedule\s+(of|for)\s+(the\s+)?interview|presentation\s+format|joining\s+(list|report|instructions)|waiting\s+list|allocation\s+of\s+(state|zone|cadre)|closure\s+notification|process\s+closure|not\s+found\s+(eligible|suitable)|cancell?ation\s+of\s+(the\s+)?(recruitment|advertisement|advt|notification|walk|interview|selection)|syllabus|information\s+handout|instructions\s+(to|for)\s+(the\s+)?candidates|reservation\s+register|seat\s+allotment|allott?ed|allotment\s+of|does\s+not\s+(call|ask|charge|demand|solicit)\b|\bresults?\s+of\b|^results?\b/i;
const SITE_PAGE_RE = /\barchived?\b|\barchives\b|recruitment\s+rules|web\s+information\s+manager|who'?s\s+who/i;
const FORM_OR_PAGE_RE =
  /proforma|pro-forma|performa|formats?\s+(for|of)\b|application\s+form(at)?s?\b|bio-?data|attestation\s+form|declaration\s+form|undertaking\s+form|\bannexure|user\s+manual|instructions\s+before|guidelines|newspaper|board\s+of\s+directors|independent\s+directors|organi[sz]ation(al)?\s+(chart|structure)|\bdirectory\b/i;
const OPENING_CUE_RE =
  /recruit|vacanc|advertis|\badvt|engagement\s+of|engaging|walk[\s-]*in|hiring|empanelment\s+of|appointment\s+of|posts?\s+of|positions?\s+of|openings?\b|invit(es|ing)\s+applications/i;

// Words of the whole URL path, not just the file name: some sites (SBI) put
// the real file name mid-path and a hash last, and many put the year in a
// folder (".../uploads/2023/..." or "Notice dtd 25.09.2023.pdf").
function urlFileWords(url) {
  try {
    return decodeURIComponent(new URL(url).pathname).replace(/[-_+./]+/g, ' ');
  } catch {
    return '';
  }
}

export function notAnOpening(title, url = '') {
  const file = urlFileWords(url);
  if (OUTCOME_RE.test(title) || OUTCOME_RE.test(file) || /\bresults?\b/i.test(file)) return true;
  if (SITE_PAGE_RE.test(title) || /\barchive/i.test(file)) return true;
  return FORM_OR_PAGE_RE.test(title) && !OPENING_CUE_RE.test(title);
}

// ─── Dates ──────────────────────────────────────────────────────────────────
const MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
const iso = (y, m, d) => {
  if (y < 100) y += 2000;
  if (!(m >= 1 && m <= 12) || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
const DATE_RE = new RegExp([
  String.raw`\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b`,
  String.raw`\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*[\s,.-]+(\d{4})\b`,
  String.raw`\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b`,
  String.raw`\b(\d{4})-(\d{2})-(\d{2})\b`,
].join('|'), 'gi');

export function findDates(text) {
  const out = [];
  for (const m of text.matchAll(DATE_RE)) {
    let d = null;
    if (m[1]) d = iso(+m[3], +m[2], +m[1]);
    else if (m[4]) d = iso(+m[6], MONTHS[m[5].toLowerCase().slice(0, 3)], +m[4]);
    else if (m[7]) d = iso(+m[9], MONTHS[m[7].toLowerCase().slice(0, 3)], +m[8]);
    else if (m[10]) d = iso(+m[10], +m[11], +m[12]);
    if (d) out.push({ date: d, index: m.index });
  }
  return out;
}

const DEADLINE_CUE_RE = /last\s+date|closing\s+date|closes?\s+on|due\s+date|on\s+or\s+before|\btill\b|\bupto\b|up\s+to|\bby\b|deadline|end\s+date/gi;

export function findDeadline(text, dates) {
  for (const cue of text.matchAll(DEADLINE_CUE_RE)) {
    const at = cue.index + cue[0].length;
    const hit = dates.find(d => d.index >= at && d.index - at <= 60);
    if (hit) return hit.date;
  }
  return null;
}

// Careers pages keep years of history next to today's openings. A notice is
// stale when every date and year it mentions is 120+ days behind today.
const STALE_DAYS = 120;

function latestYearEnd(text) {
  let latest = null;
  for (const m of text.matchAll(/\b(20\d\d)(?:\s*[-/]\s*(?:20)?(\d\d))?\b/g)) {
    if (/(act|rules|regulations?|policy|code),?\s*$/i.test(text.slice(Math.max(0, m.index - 20), m.index))) continue;
    const year = +m[1];
    const end = m[2] !== undefined && +m[2] === (year + 1) % 100 ? `${year + 1}-03-31` : `${year}-12-31`;
    if (!latest || end > latest) latest = end;
  }
  return latest;
}

export function isStale(dates, text, today) {
  const cutoff = new Date(Date.parse(today) - STALE_DAYS * 86_400_000).toISOString().slice(0, 10);
  const evidence = [...dates];
  const yearEnd = latestYearEnd(text);
  if (yearEnd) evidence.push(yearEnd);
  return evidence.length > 0 && evidence.every(d => d < cutoff);
}

// ─── Link extraction ────────────────────────────────────────────────────────
const htmlToText = (html) => decodeEntities(
  html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|div|h\d|td|th)>/gi, '\n').replace(/<[^>]+>/g, ' '),
).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();

const ANCHOR_RE = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const BLOCK_OPEN_RE = /<(tr|li|p|h[1-6]|dd|article)\b[^>]*>/gi;
const BLOCK_CLOSE_RE = /<\/(tr|li|p|h[1-6]|dd|article)>/i;

/** Text of the table row / list item / paragraph around a link. */
function surroundingBlock(html, start, end) {
  let blockStart = Math.max(0, start - 1200);
  BLOCK_OPEN_RE.lastIndex = blockStart;
  for (let m = BLOCK_OPEN_RE.exec(html); m && m.index < start; m = BLOCK_OPEN_RE.exec(html)) blockStart = m.index;
  const close = BLOCK_CLOSE_RE.exec(html.slice(end, end + 1200));
  return htmlToText(html.slice(blockStart, close ? end + close.index : end)).replace(/\n/g, ' ').trim();
}

export const noticeId = (url) => `govt-notice-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 16)}`;

// Stricter than the digest, since these become phone alerts:
// - a notice marked closed on the page is dropped;
// - a "title" that's leaked markup or script is dropped;
// - when a notice carries explicit dates, only those decide staleness (a bare
//   "2026" in a six-month-old row otherwise keeps it alive all year).
const CLOSED_RE = /status\s*:?\s*closed|(application|applications|intake|registration)\s+(intake\s+)?(is\s+)?closed|\bclosed\s*\)?\s*$/i;
const JUNK_TITLE_RE = /^\s*[>|\-–]|=\s*["']|\/>|[{};]|\bfunction\b|https?:\/\/\S+$|\bhonou?red\b|\bcongratulat|\bawards?\b|\bparticipated\b/i;

// Site furniture never holds an opening, but its links match everything
// ("Digital Banking", "Careers"). Dropped before links are read.
const stripChrome = (html) => html
  .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<(header|nav|footer)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');

/** Live-looking notices on one careers page (fresher schemes, closed and stale history dropped). */
export function extractNotices(rawHtml, pageUrl, org, today = new Date().toISOString().slice(0, 10)) {
  const html = stripChrome(rawHtml);
  const notices = new Map();
  for (const m of html.matchAll(ANCHOR_RE)) {
    const href = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[1]);
    const rawHref = decodeEntities((href?.[2] ?? href?.[3] ?? href?.[4] ?? '').trim());
    if (!rawHref || /^(#|javascript:|mailto:|tel:)/i.test(rawHref)) continue;
    let url;
    try {
      url = new URL(rawHref, pageUrl).href.replace(/#.*$/, '');
    } catch {
      continue;
    }
    if (!/^https?:/i.test(url) || url === pageUrl) continue;

    const linkText = htmlToText(m[2]).replace(/\n/g, ' ').trim();
    const context = surroundingBlock(html, m.index, m.index + m[0].length);
    const title = linkText.length >= 12 && !GENERIC_LINK_TEXT_RE.test(linkText) ? linkText : context || linkText;
    if (!title) continue;
    const both = `${title} ${context}`;

    if (!NOTICE_RE.test(both) || NOT_A_NOTICE_RE.test(both)) continue;
    if (title.length < 12 && !PDF_URL_RE.test(url)) continue; // the page's own menu ("Careers")
    if (notAnOpening(title, url) || FRESHER_RE.test(title)) continue;
    if (JUNK_TITLE_RE.test(title) || CLOSED_RE.test(title) || CLOSED_RE.test(context)) continue;

    const dates = findDates(context || title);
    // No date in the row: fall back to dates and years in the URL path.
    const urlWords = urlFileWords(url);
    const staleEvidence = dates.length ? dates : findDates(urlWords);
    if (staleEvidence.length ? isStale(staleEvidence.map(d => d.date), '', today) : isStale([], `${both} ${urlWords}`, today)) continue;
    const deadline = findDeadline(context || title, dates);
    const existing = notices.get(url);
    if (existing && existing.title.length >= title.length) continue;
    notices.set(url, {
      id: noticeId(url),
      title: shortTitle(title),
      company: org.name,
      location: org.location || '',
      url,
      date: dates.find(d => d.date !== deadline)?.date || null,
      deadline,
      flags: eligibilityFlags(both),
      role: roleMatch(both),
      isPdf: PDF_URL_RE.test(url),
      org: org.short,
      category: org.category,
      source: `🏛️ Govt (${org.short} careers page)`,
    });
  }
  return [...notices.values()];
}

// Row text can run to hundreds of characters ("Product Manager - Contractual
// Technical 2 24/3/2026 Advertisement Corrigendum Application Portal link...").
// Keep the first sentence-ish chunk.
function shortTitle(title) {
  const t = title.replace(/\s+/g, ' ').trim()
    .replace(/\s*\(?\s*type\s*:\s*pdf[\s\S]*$/i, '')            // "TYPE:PDF,SIZE: 228 KB"
    .replace(/\s*last\s+date\s*:?\s*[\d./-]+\s*$/i, '')         // shown separately as the deadline
    .replace(/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s+/, '')           // a leading date column
    .replace(/\s*\b(click\s+here|download|view|apply\s+online)\b.*$/i, '')  // row text after the link label
    .replace(/\s+\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/, '')            // a trailing date column
    .trim();
  if (t.length <= 140) return t;
  const cut = t.slice(0, 140);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 80)) + '…';
}

// A job title somewhere in the notice: without one it's a page link
// ("Software Applications", "Download the Strategy Paper").
const ROLE_WORD_RE = /manager|\bhead\b|director|\blead\b|chief|\bgm\b|\bagm\b|\bdgm\b|consultant|advisor|adviser|expert|specialist|officer|executive|analyst|associate|architect|professional|\bposts?\b|positions?|vacanc|recruit|engagement\s+of|hiring|walk[\s-]*in/i;

// PM-shaped work that govt rarely titles "product": digital programme and
// transformation leadership. Plain IT roles (IT Officer, Data Scientist,
// Solution Architect) are not, however digital the org.
const PM_ADJACENT_RE = /programme\s+manag|program\s+manag|digital\s+(transformation|banking|product|strategy|initiatives?|platforms?|channels?|lending|payments?)|head\W{0,3}(of\s+)?digital|chief\s+digital|\bcdo\b|innovation\s+(lead|head|manager|officer)|platform\s+(lead|head|manager|owner)|e-?governance\s+(consultant|expert|manager|specialist)|\bfintech\b/i;

/**
 * Worth an alert (and a line in the app): a real job title that is a product
 * role, or PM-adjacent digital leadership at an org the registry rates
 * high/medium for PM work. Deputation-only notices never.
 */
export const isAlertableNotice = (notice, relevance) =>
  !notice.flags.includes('deputation_or_govt_employees_only') &&
  ROLE_WORD_RE.test(notice.title) &&
  // Judged on the title: a row's surrounding text often mentions "product" in passing.
  (roleMatch(notice.title) === 'product' || (relevance !== 'low' && PM_ADJACENT_RE.test(notice.title)));
