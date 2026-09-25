// Indian government, PSU and government-backed organisations that hire (or
// have hired) for product / digital roles. The org list itself is GENERATED
// into govtOrgsList.js by scripts/sync-govt-registry.mjs; this file holds the
// hand-written parts: category labels, boards, and searches.
export { GOVT_ORGS, GOVT_REGISTRY_VERIFIED } from './govtOrgsList.js';

export const GOVT_CATEGORIES = {
  govt_backed_other: 'Govt-backed tech',
  section8_govt:     'Govt Section 8 co.',
  autonomous_body:   'Autonomous body',
  statutory_body:    'Statutory body',
  govt_dept:         'Govt department',
  maharatna:         'Maharatna PSU',
  navratna:          'Navratna PSU',
  miniratna:         'Miniratna PSU',
  cpse_other:        'Other CPSE',
  psb:               'Public sector bank',
  psu_insurer:       'PSU insurer',
};

// Boards that aggregate government / public-interest openings. Each URL was
// checked live (HTTP 200) on 2026-09-25.
export const GOVT_BOARDS = [
  { name:'Bharat Digital',       url:'https://jobs.bharatdigital.io/',            tip:'Public-interest tech roles: C-DAC, SEBI, IHMCL, ONDC, eGov, state missions' },
  { name:'DIC ORA portal',       url:'https://ora.digitalindiacorporation.in/',   tip:'Digital India Corporation hiring: IndiaAI, Bhashini, MyGov, NeGD projects' },
  { name:'National Career Service', url:'https://www.ncs.gov.in/',                tip:'Ministry of Labour portal, many PSU and ministry vacancies are cross-posted' },
  { name:'FreeJobAlert',         url:'https://www.freejobalert.com/',             tip:'Fastest aggregator of PSU / bank notices, check the "Latest" list' },
  { name:'Sarkari Result',       url:'https://www.sarkariresult.com/',            tip:'Official notification PDFs with last dates' },
  { name:'IndGovtJobs',          url:'https://www.indgovtjobs.in/',               tip:'Good for contractual / consultant roles in ministries' },
];

// Google searches for PM-shaped roles in the public sector. Govt orgs rarely
// say "Product Manager": the same job is posted as Consultant, Specialist
// Officer, Manager (Digital), or Lead / Senior Associate - Product.
export const GOVT_SEARCHES = [
  { title:'Product roles on gov.in / nic.in', query:'"product manager" OR "product management" (site:gov.in OR site:nic.in)' },
  { title:'Consultant (Product / Digital)',   query:'("consultant" OR "senior consultant") ("product" OR "digital") (site:gov.in OR site:nic.in) "last date"' },
  { title:'PSU bank specialist officers',     query:'"specialist officer" ("product" OR "digital banking") (site:bank.in OR site:sbi.co.in) recruitment' },
  { title:'PSU lateral hiring: digital',      query:'"lateral" ("product" OR "digital") (PSU OR "public sector") recruitment notification' },
  { title:'MeitY / Digital India openings',   query:'("product" OR "programme manager") (site:digitalindiacorporation.in OR site:meity.gov.in OR site:negd.gov.in)' },
];

export const googleUrl = (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=qdr:m`;
export const orgPmSearchUrl = (org) => googleUrl(`site:${org.domain} ("product" OR "digital") (recruitment OR vacancy OR career OR consultant)`);
