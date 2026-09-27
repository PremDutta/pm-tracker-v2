// `keyword` (not `label`) is what gets sent into every job-board URL/slug.
// Keeping them separate stops "Senior PM" from producing broken slugs like
// naukri.com/senior-pm-jobs-in-... instead of .../senior-product-manager-jobs-in-...
//
// `searchTerm` is the phrase every Google / Alert search string uses. Senior
// roles get posted under several spellings (and "SPM" in recruiter posts), so
// the senior term ORs them; "SPM" never appears alone, since on its own it
// matches unrelated pages.
export const ROLES = [
  { label:'Product Manager', keyword:'Product Manager',        searchTerm:'"product manager"' },
  { label:'Senior PM',       keyword:'Senior Product Manager', searchTerm:'("senior product manager" OR "sr. product manager" OR "senior PM" OR "SPM")' },
];

export const roleByKeyword = (keyword) => ROLES.find(r => r.keyword === keyword) || ROLES[0];

// Fills role placeholders in search strings and URLs:
//   {ROLE}   -> the role's Google search term
//   {KWTEXT} -> the plain keyword ("Senior Product Manager")
//   {KW}     -> URL-encoded keyword with %20 ("Senior%20Product%20Manager")
//   {KW+}    -> URL-encoded keyword with + ("Senior+Product+Manager")
export const fillRole = (text, role) => text && text
  .replace(/\{ROLE\}/g, role.searchTerm)
  .replace(/\{KWTEXT\}/g, role.keyword)
  .replace(/\{KW\+\}/g, encodeURIComponent(role.keyword).replace(/%20/g, '+'))
  .replace(/\{KW\}/g, encodeURIComponent(role.keyword));

// Posted-date filter — only LinkedIn (f_TPR, seconds), Naukri (jobAge, days) and
// Indeed (fromage, days) expose a real freshness param on their public search URLs.
// Every other platform ignores this; there's no documented equivalent for them.
export const FRESHNESS_OPTIONS = [
  { id:'any',   label:'Any time',      days:null, linkedinSec:null },
  { id:'24h',   label:'Past 24 hours', days:1,    linkedinSec:86400 },
  { id:'3d',    label:'Past 3 days',   days:3,    linkedinSec:259200 },
  { id:'7d',    label:'Past week',     days:7,    linkedinSec:604800 },
];

// Experience filter — approximate mapping onto the two platforms with a real
// structured experience param: LinkedIn's f_E title-seniority buckets and
// Naukri's experience-in-years range. Everything else has no such filter, so
// role text (see ROLES) is the only lever available on those boards.
export const EXPERIENCE_LEVELS = [
  { id:'any',   label:'Any experience', min:null, max:null, linkedinE:null },
  { id:'0-2',   label:'0-2 yrs',        min:0,    max:2,    linkedinE:2 },
  { id:'3-5',   label:'3-5 yrs',        min:3,    max:5,    linkedinE:3 },
  { id:'6-9',   label:'6-9 yrs',        min:6,    max:9,    linkedinE:4 },
  { id:'10-15', label:'10-15 yrs',      min:10,   max:15,   linkedinE:5 },
  { id:'15+',   label:'15+ yrs',        min:15,   max:20,   linkedinE:6 },
];
