// When each feature shipped. Anything added in the last NEW_FOR_DAYS days gets
// a NEW badge (tab bar, Home cards, hack cards, sections) and a line in Home's
// "What's new"; badges expire on their own, so nothing stays "new" for months.
//
// id convention: 'tab:<tab id>', 'hack:<hack id>', or '<tab>:<section>'.
// Add an entry here whenever you ship something user-visible; give it a desc
// to also list it in Home's "What's new".

export const NEW_FOR_DAYS = 14;

export const WHATS_NEW = [
  { id:'tab:tracker',      date:'2026-09-04', tab:'tracker',     title:'Application Tracker' },
  { id:'tab:watchlist',    date:'2026-09-04', tab:'watchlist',   title:'Target Company Watchlist' },
  { id:'tab:resumematch',  date:'2026-09-04', tab:'resumematch', title:'Resume ↔ JD Match' },
  { id:'tab:govt',         date:'2026-09-25', tab:'govt',        title:'Govt & PSU jobs', desc:'Live product roles at 60 govt, PSU and govt-backed orgs, scanned every 6h' },
  { id:'govt:coverage',    date:'2026-09-25', tab:'govt',        title:'Auto-scanned vs Check manually', desc:'Every govt org shows whether the scanner covers it' },
  { id:'hack-cat:signals', date:'2026-09-27', tab:'hacks', title:'Hiring Signals searches', desc:'Funding rounds, new CPOs and govt PMU contract awards: spot PM roles 1-3 months before they are posted' },
  { id:'hack:funding-raises', date:'2026-09-27', tab:'hacks', title:'Just Raised = Hiring Soon' },
  { id:'hack:new-product-leader', date:'2026-09-27', tab:'hacks', title:'New CPO / VP Product = New Team' },
  { id:'hack:pmu-awards', date:'2026-09-27', tab:'hacks', title:'Govt PMU Contract Awards' },
  { id:'hack:pmu-jobs', date:'2026-09-27', tab:'hacks', title:'Consultancy PMU Openings' },
  { id:'hack:founder-posts', date:'2026-09-27', tab:'hacks', title:'Founder / Hiring Manager Posts', desc:'Plus Notion careers pages and Google Sheets job lists: roles that never reach a job board' },
  { id:'hack:notion-boards', date:'2026-09-27', tab:'hacks', title:'Notion Careers Pages' },
  { id:'hack:sheet-boards', date:'2026-09-27', tab:'hacks', title:'Google Sheets Job Lists' },
  { id:'tab:signals', date:'2026-09-27', tab:'signals', title:'Hiring Signals tab', desc:'Reposted PM roles, engineering hiring spikes and fresh funding at your target companies: roles before they are posted' },
  { id:'signals:vc-boards', date:'2026-09-27', tab:'signals', title:'VC portfolio boards in your alerts', desc:'PM roles in India across Peak XV, Lightspeed and Accel portfolio companies are now scanned every 6h' },
  { id:'signals:funding', date:'2026-09-27', tab:'signals', title:'Funding news signals', desc:'Every raise reported by Entrackr, YourStory and Inc42, with one-click links to the company\'s PM roles and product leaders' },
  { id:'hack:indian-ats', date:'2026-09-27', tab:'hacks', title:'Indian ATS: Zoho Recruit, Keka, Freshteam', desc:'Search them in Hacks, and add companies on them to the Watchlist: the scanner now reads all three' },
  { id:'govt:dpi', date:'2026-09-27', tab:'govt', title:'ONDC, eGov, Wadhwani AI and state missions', desc:'Digital public infrastructure orgs and state startup missions added to the Govt & PSU scan (ONDC is hiring a Product Head)' },
  { id:'hack-cat:ats', date:'2026-09-29', tab:'hacks', title:'ATS Direct: 13 job systems, India-filtered', desc:'Ashby, Greenhouse (incl. its new job-boards domain), Lever, Workday, Workable, SmartRecruiters, Teamtailor, Personio, BambooHR and more, plus two one-click sweeps' },
  { id:'hack:ats-sweep-startup', date:'2026-09-29', tab:'hacks', title:'Startup ATS Sweep' },
  { id:'hack:ats-sweep-enterprise', date:'2026-09-29', tab:'hacks', title:'Enterprise ATS Sweep' },
  { id:'hack:workable', date:'2026-09-29', tab:'hacks', title:'Workable' },
  { id:'hack:smartrecruiters', date:'2026-09-29', tab:'hacks', title:'SmartRecruiters' },
  { id:'hack:ats-europe', date:'2026-09-29', tab:'hacks', title:'Teamtailor, Personio, Recruitee' },
  { id:'hack:ats-smb', date:'2026-09-29', tab:'hacks', title:'BambooHR, Breezy, JazzHR, Pinpoint' },
  { id:'hack:ats-new-gen', date:'2026-09-29', tab:'hacks', title:'Gem, Dover, Rippling' },
  { id:'hack:ashby', date:'2026-09-29', tab:'hacks', title:'Ashby: now India-filtered' },
  { id:'hack:greenhouse', date:'2026-09-29', tab:'hacks', title:'Greenhouse: new job-boards domain added' },
  { id:'hack:lever', date:'2026-09-29', tab:'hacks', title:'Lever: now India-filtered' },
  { id:'hack:workday', date:'2026-09-29', tab:'hacks', title:'Workday: all tenants, not just wd5' },
  { id:'hack:indian-ats', date:'2026-09-29', tab:'hacks', title:'Indian ATS: Darwinbox added' },
  { id:'network:matcher', date:'2026-09-27', tab:'watchlist', title:'My network: referral matcher', desc:'List ex-colleagues once; every company where you know someone is flagged in Watchlist, Tracker and Govt openings' },
  { id:'tracker:teardown', date:'2026-09-27', tab:'tracker', title:'Teardown brief for AI', desc:'One click on any application copies a brief to draft a product teardown for the hiring manager' },
  { id:'role:search',      date:'2026-09-27', tab:'hacks',       title:'Searches follow the PM / Senior PM toggle', desc:'Senior PM searches include "senior product manager", "sr. product manager", "senior PM" and "SPM"' },
];

const byId = new Map(WHATS_NEW.map(f => [f.id, f]));

const daysSince = (isoDay, now = new Date()) => {
  const then = new Date(`${isoDay}T00:00:00`);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  return Math.round((today - then) / 86_400_000);
};

export const isNew = (id, now = new Date()) => {
  const f = byId.get(id);
  return !!f && daysSince(f.date, now) <= NEW_FOR_DAYS;
};

/** Features still inside the NEW window that carry a desc (the headline
 *  entries; per-card entries only drive badges), newest first. */
export const recentFeatures = (now = new Date()) =>
  WHATS_NEW.filter(f => f.desc && daysSince(f.date, now) <= NEW_FOR_DAYS).sort((a, b) => b.date.localeCompare(a.date));
