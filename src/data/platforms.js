// The 26 job platforms. Each one's `getUrl(role, location, opts)` builds the
// search URL for that specific site — every URL here was verified against
// the real, live site during development, not guessed from docs.
export const PLATFORMS = {
  // India-first
  linkedin:     { name:'LinkedIn',       icon:'💼', color:'#0A66C2', region:'global', priority:1, badge:'🔥 Top',    getUrl:(r,l,o)=>{
    // Was hardcoding "<city>, India" even under Remote/International — searches silently stayed India-only there.
    const region = o?.region;
    const locationParam = region==='india' ? `&location=${encodeURIComponent(l+', India')}` : (l ? `&location=${encodeURIComponent(l)}` : '');
    const remoteParam = region==='remote' ? '&f_WT=2' : ''; // LinkedIn's real "Remote" work-type filter
    return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(r)}&sortBy=DD${locationParam}${remoteParam}${o?.freshness?.linkedinSec?`&f_TPR=r${o.freshness.linkedinSec}`:''}${o?.experience?.linkedinE?`&f_E=${o.experience.linkedinE}`:''}`;
  }, description:'Professional network, newest first' },
  naukri:       { name:'Naukri',          icon:'🔵', color:'#4A67FF', region:'india',  priority:2, badge:'#1 India', getUrl:(r,l,o)=>{
    const citySlug = l.toLowerCase().replace(/\s+/g,'-');
    // k=, l=, sort=f (date) and jobAge= all confirmed via real captured naukri.com URLs.
    return `https://www.naukri.com/${r.toLowerCase().replace(/\s+/g,'-')}-jobs-in-${citySlug}?sort=f&k=${encodeURIComponent(r)}&l=${encodeURIComponent(citySlug)}${o?.freshness?.days?`&jobAge=${o.freshness.days}`:''}${o?.experience?.min!=null?`&experience=${o.experience.min}`:''}`;
  }, description:'Largest Indian job board' },
  iimjobs:      { name:'IIMJobs',         icon:'🎓', color:'#C0392B', region:'india',  priority:3, badge:'Senior',  getUrl:(r)=>`https://www.iimjobs.com/search/${r.toLowerCase().replace(/\s+/g,'-')}-jobs`, description:'Senior & management roles' },
  instahyre:    { name:'Instahyre',       icon:'🚀', color:'#FF6B35', region:'india',  priority:4, badge:'Startup', getUrl:(r)=>`https://www.instahyre.com/search-jobs/?job_types=fulltime&job_titles=${encodeURIComponent(r)}`, description:'Curated startup jobs' },
  cutshort:     { name:'Cutshort',        icon:'⚡', color:'#FF4757', region:'india',  priority:5,               getUrl:(r)=>`https://cutshort.io/jobs/${r.toLowerCase().replace(/\s+/g,'-')}-jobs`, description:'AI-matched, fast responses' },
  foundit:      { name:'Foundit',         icon:'🎯', color:'#E91E63', region:'india',  priority:6,               getUrl:(r,l)=>{
    // Route + query shape confirmed via a real captured foundit.in URL — the old
    // /srp/results?...&sort=1 guess never actually matched what the site renders.
    const isGurgaon = /gurgaon|gurugram/i.test(l);
    const citySlug = isGurgaon ? 'gurgaon-gurugram' : l.toLowerCase().replace(/\s+/g,'-');
    const locLabel = isGurgaon ? 'Gurgaon / Gurugram' : l;
    return `https://www.foundit.in/search/${r.toLowerCase().replace(/\s+/g,'-')}-jobs-in-${citySlug}?query=${encodeURIComponent(r)}&queryEntity=${encodeURIComponent(r+':DESIGNATION')}&locations=${encodeURIComponent(locLabel)}&queryDerived=true`;
  }, description:'Monster India rebranded' },
  shine:        { name:'Shine',           icon:'✨', color:'#FF9800', region:'india',  priority:7,               getUrl:(r,l)=>`https://www.shine.com/job-search/${r.toLowerCase().replace(/\s+/g,'-')}-jobs-in-${l.toLowerCase()}`, description:'Mid-level roles, clean UX' },
  hirist:       { name:'Hirist',          icon:'💻', color:'#2ECC71', region:'india',  priority:8,               getUrl:(r)=>`https://www.hirist.tech/search/${r.toLowerCase().replace(/\s+/g,'-')}-jobs`, description:'Tech & digital focused' },
  hirect:       { name:'Hirect',          icon:'💬', color:'#9B59B6', region:'india',  priority:9, badge:'Chat',   getUrl:()=>`https://hirect.in/`, description:'Chat directly with founders' },
  apna:         { name:'Apna',            icon:'👥', color:'#1ABC9C', region:'india',  priority:10,              getUrl:(r,l)=>`https://apna.co/jobs/title_${r.toLowerCase().replace(/\s+/g,'_')}-jobs-in-${(l||'india').toLowerCase()}`, description:'Vernacular job discovery' },
  // Global aggregators
  indeed:       { name:'Indeed',          icon:'🔍', color:'#2164F3', region:'global', priority:11,              getUrl:(r,l,o)=>{
    // Was hardcoded to the India subdomain (in.indeed.com) + l=India even under Remote/International.
    if (o?.region==='india') return `https://in.indeed.com/jobs?q=${encodeURIComponent(r)}&l=${encodeURIComponent(l)}&sort=date${o?.freshness?.days?`&fromage=${o.freshness.days}`:''}`;
    return `https://www.indeed.com/jobs?q=${encodeURIComponent(r)}&sort=date${o?.freshness?.days?`&fromage=${o.freshness.days}`:''}`;
  }, description:'Global aggregator, fresh daily' },
  glassdoor:    { name:'Glassdoor',       icon:'🚪', color:'#0CAA41', region:'global', priority:12,              getUrl:(r,l,o)=>{
    // Was hardcoded to locId=115 (India) unconditionally, even under Remote/International.
    if (o?.region==='india') return `https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${encodeURIComponent(r)}&locT=N&locId=115&sortBy=date_desc`;
    return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(r)}&sortBy=date_desc`;
  }, description:'Reviews + salary + jobs' },
  wellfound:    { name:'Wellfound',       icon:'😇', color:'#8B8BFF', region:'global', priority:13, badge:'Equity',getUrl:()=>`https://wellfound.com/role/product-manager`, description:'Startup equity-first (fka AngelList)' },
  levelsfyi:    { name:'Levels.fyi',      icon:'📊', color:'#00D4AA', region:'global', priority:14,              getUrl:(r,l,o)=>{
    // Was hardcoded to /jobs/location/india unconditionally, even under Remote/International.
    return o?.region==='india' ? `https://www.levels.fyi/jobs/location/india` : `https://www.levels.fyi/jobs`;
  }, description:'Comp-transparent listings' },
  // Remote
  remoteok:     { name:'RemoteOK',        icon:'🌍', color:'#00D4AA', region:'remote', priority:15,              getUrl:()=>'https://remoteok.com/remote-product-manager-jobs', description:'Remote-first PM jobs' },
  weworkremotely:{ name:'WeWorkRemotely', icon:'🏠', color:'#2D3748', region:'remote', priority:16,              getUrl:()=>'https://weworkremotely.com/categories/remote-product-jobs', description:'Top remote board globally' },
  remoteco:     { name:'Remote.co',       icon:'🌐', color:'#3182CE', region:'remote', priority:17,              getUrl:()=>'https://remote.co/remote-jobs/product/', description:'Curated remote roles' },
  flexjobs:     { name:'FlexJobs',        icon:'🤸', color:'#6B46C1', region:'remote', priority:18,              getUrl:(r)=>`https://www.flexjobs.com/search?search=${encodeURIComponent(r)}`, description:'Vetted remote & flexible' },
  // US/UK/International
  builtin:      { name:'Built In',        icon:'🏙️', color:'#0066FF', region:'us',     priority:19,              getUrl:()=>'https://builtin.com/jobs/product-management', description:'US tech hub jobs' },
  wttj:         { name:'Welcome to the Jungle', icon:'🌴', color:'#FFCF52', region:'global', priority:20, badge:'fka Otta', getUrl:(r)=>`https://www.welcometothejungle.com/en/jobs?query=${encodeURIComponent(r)}`, description:'Euro tech jobs — acquired Otta in 2024' },
  underdog:     { name:'Underdog.io',     icon:'🥷', color:'#1A1A2E', region:'us',     priority:21, badge:'Invite',getUrl:()=>'https://underdog.io/', description:'Apply once, many startups' },
  phmind:       { name:'Mind the Product',icon:'🧠', color:'#E53E3E', region:'global', priority:22,              getUrl:()=>'https://www.mindtheproduct.com/jobs/', description:'PM-specific community board' },
  naukrigulf:   { name:'NaukriGulf',      icon:'🕌', color:'#00A65A', region:'global', priority:23,              getUrl:(r)=>`https://www.naukrigulf.com/${r.toLowerCase().replace(/\s+/g,'-')}-jobs`, description:'UAE, Saudi & Gulf PM roles' },
  y_combinator: { name:'YC Job Board',    icon:'🔶', color:'#FF6600', region:'global', priority:24, badge:'YC',   getUrl:()=>'https://www.ycombinator.com/jobs/role/product-manager', description:'YC-backed startup jobs' },
  simplyhired:  { name:'SimplyHired',     icon:'🔎', color:'#3B88C3', region:'global', priority:25,              getUrl:(r,l,o)=>{
    // Was hardcoded to the .co.in domain + l=India even under Remote/International.
    if (o?.region==='india') return `https://www.simplyhired.co.in/search?q=${encodeURIComponent(r)}&l=${encodeURIComponent(l)}&sb=dd`;
    return `https://www.simplyhired.com/search?q=${encodeURIComponent(r)}&sb=dd`;
  }, description:'India + global aggregator' },
  timesjobs:    { name:'TimesJobs',       icon:'⏰', color:'#E44D26', region:'india',  priority:26,              getUrl:(r,l)=>`https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=${encodeURIComponent(r)}&txtLocation=${encodeURIComponent(l)}`, description:'Times Group board' },
  dice:         { name:'Dice',            icon:'🎲', color:'#005A9C', region:'us',     priority:27,              getUrl:(r)=>`https://www.dice.com/jobs/q-${encodeURIComponent(r).replace(/%20/g,'+')}-jobs`, description:'US tech-focused board' },
  bayt:         { name:'Bayt.com',        icon:'🌴', color:'#00A19A', region:'global', priority:28,              getUrl:(r)=>`https://www.bayt.com/en/international/jobs/${r.toLowerCase().replace(/\s+/g,'-')}-jobs/`, description:'Leading MENA/Gulf board' },
};
