import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, ExternalLink, Zap, Globe, Copy, Check, Briefcase, Target, Lightbulb, MessageSquare, Users, Clock, Star, ChevronDown, ChevronUp, Mail, Sun, Moon, Sparkles, ArrowRight, Award, Rocket, Bell, ClipboardList, Building2, FileSearch, ThumbsUp } from 'lucide-react';
import { getProfile, getPlatformMeta, markPlatformChecked, markPlatformUseful, timeAgo } from './storage';
import ProfileEditor from './components/ProfileEditor';
import Tracker from './components/Tracker';
import Watchlist from './components/Watchlist';
import ResumeMatch from './components/ResumeMatch';

// ─── THEMES ──────────────────────────────────────────────────────────────────
const themes = {
  dark: {
    name: 'dark', bg: '#000000', bgSecondary: '#0a0a0a',
    surface: 'rgba(28,28,30,0.8)', surfaceHover: 'rgba(44,44,46,0.9)',
    surfaceSolid: '#1c1c1e', border: 'rgba(255,255,255,0.1)',
    borderHover: 'rgba(255,255,255,0.2)', text: '#f5f5f7',
    textSecondary: 'rgba(255,255,255,0.6)', textTertiary: 'rgba(255,255,255,0.4)',
    accent: '#0A84FF', accentHover: '#409CFF', accentGlow: 'rgba(10,132,255,0.3)',
    success: '#30D158', warning: '#FFD60A', error: '#FF453A',
    gradient1: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
    gradient2: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
    gradient3: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
    gradient4: 'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
    gradient5: 'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
    cardBg: 'rgba(255,255,255,0.04)', cardBgHover: 'rgba(255,255,255,0.08)',
    templateBg: '#1e1e20',
    heroGradient: 'radial-gradient(ellipse 80% 50% at 50% -20%,rgba(120,119,198,0.3),transparent)',
    glassEffect: 'saturate(180%) blur(20px)',
    codeBg: 'rgba(255,255,255,0.08)', codeColor: '#64d2ff',
    badgeBg: 'rgba(255,255,255,0.13)', badgeText: '#f5f5f7',
    inlineBg: 'rgba(255,255,255,0.06)',
  },
  light: {
    name: 'light', bg: '#ffffff', bgSecondary: '#f5f5f7',
    surface: 'rgba(255,255,255,0.8)', surfaceHover: 'rgba(255,255,255,0.95)',
    surfaceSolid: '#ffffff', border: 'rgba(0,0,0,0.08)',
    borderHover: 'rgba(0,0,0,0.15)', text: '#1d1d1f',
    textSecondary: 'rgba(0,0,0,0.56)', textTertiary: 'rgba(0,0,0,0.36)',
    accent: '#0071E3', accentHover: '#0077ED', accentGlow: 'rgba(0,113,227,0.2)',
    success: '#34C759', warning: '#FF9500', error: '#FF3B30',
    gradient1: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
    gradient2: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
    gradient3: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
    gradient4: 'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
    gradient5: 'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
    cardBg: 'rgba(0,0,0,0.02)', cardBgHover: 'rgba(0,0,0,0.04)',
    templateBg: '#f7f7f9',
    heroGradient: 'radial-gradient(ellipse 80% 50% at 50% -20%,rgba(120,119,198,0.15),transparent)',
    glassEffect: 'saturate(180%) blur(20px)',
    codeBg: 'rgba(0,0,0,0.06)', codeColor: '#0055cc',
    badgeBg: 'rgba(0,0,0,0.07)', badgeText: '#1d1d1f',
    inlineBg: 'rgba(0,0,0,0.04)',
  }
};

// ─── PLATFORMS ───────────────────────────────────────────────────────────────
const PLATFORMS = {
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
};

// ─── INDIA LOCATIONS ─────────────────────────────────────────────────────────
const INDIA_LOCATIONS = [
  {id:'noida',name:'Noida'},{id:'delhi',name:'Delhi'},{id:'gurgaon',name:'Gurugram'},
  {id:'bangalore',name:'Bengaluru'},{id:'hyderabad',name:'Hyderabad'},{id:'mumbai',name:'Mumbai'},
  {id:'pune',name:'Pune'},{id:'chennai',name:'Chennai'},{id:'kolkata',name:'Kolkata'},
  {id:'ahmedabad',name:'Ahmedabad'},{id:'jaipur',name:'Jaipur'},{id:'kochi',name:'Kochi'},
];

// ─── ROLES ───────────────────────────────────────────────────────────────────
// `keyword` (not `label`) is what gets sent into every job-board URL/slug.
// Keeping them separate stops "Senior PM" from producing broken slugs like
// naukri.com/senior-pm-jobs-in-... instead of .../senior-product-manager-jobs-in-...
const ROLES = [
  { label:'Product Manager', keyword:'Product Manager' },
  { label:'Senior PM',       keyword:'Senior Product Manager' },
];

// Posted-date filter — only LinkedIn (f_TPR, seconds), Naukri (jobAge, days) and
// Indeed (fromage, days) expose a real freshness param on their public search URLs.
// Every other platform ignores this; there's no documented equivalent for them.
const FRESHNESS_OPTIONS = [
  { id:'any',   label:'Any time',      days:null, linkedinSec:null },
  { id:'24h',   label:'Past 24 hours', days:1,    linkedinSec:86400 },
  { id:'3d',    label:'Past 3 days',   days:3,    linkedinSec:259200 },
  { id:'7d',    label:'Past week',     days:7,    linkedinSec:604800 },
];

// Experience filter — approximate mapping onto the two platforms with a real
// structured experience param: LinkedIn's f_E title-seniority buckets and
// Naukri's experience-in-years range. Everything else has no such filter, so
// role text (see ROLES) is the only lever available on those boards.
const EXPERIENCE_LEVELS = [
  { id:'any',   label:'Any experience', min:null, max:null, linkedinE:null },
  { id:'0-2',   label:'0-2 yrs',        min:0,    max:2,    linkedinE:2 },
  { id:'3-5',   label:'3-5 yrs',        min:3,    max:5,    linkedinE:3 },
  { id:'6-9',   label:'6-9 yrs',        min:6,    max:9,    linkedinE:4 },
  { id:'10-15', label:'10-15 yrs',      min:10,   max:15,   linkedinE:5 },
  { id:'15+',   label:'15+ yrs',        min:15,   max:20,   linkedinE:6 },
];

// ─── GOOGLE HACKS ─────────────────────────────────────────────────────────────
const GOOGLE_HACKS = [
  // ⏰ Speed hacks
  { category: 'speed', id:'today', title:'Jobs Posted Today', icon:'⚡', badge:'FASTEST',
    query:'"product manager" (hiring OR "we\'re hiring" OR "join us") india',
    tip:'Filter to "Past 24 hours" in Google tools — beat every applicant',
    timeFilter:true, googleJobsUrl:'https://www.google.com/search?q=%22product+manager%22+jobs+india&ibp=htl;jobs&htidocid=&tbs=qdr:d' },
  { category: 'speed', id:'lastweek', title:'Last 7 Days Across All Sites', icon:'📅', badge:'EARLY',
    query:'"product manager" india jobs (noida OR delhi OR bangalore OR hyderabad)',
    tip:'Broad sweep of this week\'s postings — high volume, low competition',
    timeFilter:true },
  { category: 'speed', id:'google-jobs', title:'Google for Jobs — Direct', icon:'🔍',
    query:'product manager jobs india',
    tip:'Google aggregates 100s of boards in one place — sort by date',
    googleJobsUrl:'https://www.google.com/search?q=product+manager+jobs+india&ibp=htl;jobs' },
  // 🔮 Hidden jobs
  { category: 'hidden', id:'greenhouse', title:'Greenhouse ATS Direct', icon:'🏭', badge:'UNLISTED',
    query:'site:boards.greenhouse.io "product manager"',
    tip:'Jobs before they hit job boards — zero competition' },
  { category: 'hidden', id:'lever', title:'Lever ATS Direct', icon:'🧲',
    query:'site:jobs.lever.co "product manager"',
    tip:'Same hack for Lever-powered companies' },
  { category: 'hidden', id:'workday', title:'Workday Careers Direct', icon:'🏢',
    query:'site:*.wd5.myworkdayjobs.com "product manager"',
    tip:'Large enterprise corps post here before job boards' },
  { category: 'hidden', id:'ashby', title:'Ashby ATS (Startups)', icon:'🌱',
    query:'site:jobs.ashbyhq.com "product manager"',
    tip:'Preferred ATS for fast-growing startups in 2024-25' },
  { category: 'hidden', id:'linkedin-hidden', title:'LinkedIn Hidden Gems', icon:'🔮', badge:'SECRET',
    query:'site:linkedin.com/jobs "product manager" ("noida" OR "delhi" OR "bangalore") -"Easy Apply"',
    tip:'Jobs where direct applicants are rare — not via Easy Apply crowd' },
  { category: 'hidden', id:'company-careers', title:'Company Career Pages', icon:'🎯',
    query:'site:*.com/careers "product manager" india -site:linkedin.com -site:naukri.com -site:indeed.com',
    tip:'Skip all middlemen — straight to source' },
  // 💰 Salary & senior
  { category: 'senior', id:'salary', title:'Salary-Disclosed Roles', icon:'💰', badge:'CTC VISIBLE',
    query:'"product manager" india (CTC OR LPA OR "per annum") (₹ OR lakhs OR lakh)',
    tip:'Companies showing salary upfront = serious hiring, less ghosting' },
  { category: 'senior', id:'senior-pm', title:'Senior PM Roles Only', icon:'🎖️',
    query:'"senior product manager" india (hiring OR "open position" OR "we are hiring")',
    tip:'Explicitly senior roles across all sources' },
  { category: 'senior', id:'director-pm', title:'Group PM / Director Level', icon:'👑',
    query:'("group product manager" OR "director of product" OR "head of product") india',
    tip:'Leadership-track PM roles — often unadvertised' },
  { category: 'senior', id:'iimjobs-senior', title:'Premium Senior Roles', icon:'🏆',
    query:'site:iimjobs.com "product manager"',
    tip:'IIMJobs = senior roles 15L+ CTC, less noise' },
  // 🤝 Referral hacks
  { category: 'referral', id:'linkedin-referral', title:'Referral Opportunities', icon:'🤝', badge:'10x ODDS',
    query:'site:linkedin.com/posts "product manager" ("referral" OR "hiring in my team" OR "refer" OR "dm me")',
    tip:'Referred candidates are 4-10x more likely to get hired' },
  { category: 'referral', id:'twitter-hiring', title:'Twitter/X Hiring Threads', icon:'🐦',
    query:'site:twitter.com OR site:x.com "product manager" (hiring OR "we\'re hiring") india',
    tip:'Founders + PMs post openings on Twitter first — hot leads' },
  { category: 'referral', id:'reddit-hiring', title:'Reddit Job Posts', icon:'🤖',
    query:'site:reddit.com "product manager" (hiring OR "looking for" OR "DM me") india',
    tip:'r/india, r/IndiaJobs — low competition, high response rate' },
  // 🌍 Remote
  { category: 'remote', id:'remote-worldwide', title:'Remote — Worldwide Open', icon:'🌏', badge:'VISA-FREE',
    query:'"product manager" remote worldwide -"us only" -"us citizens" -"uk only" -"eu only"',
    tip:'Explicitly open to Indian applicants — no visa needed' },
  { category: 'remote', id:'remote-india-ok', title:'Remote India-Friendly', icon:'🇮🇳',
    query:'"product manager" remote ("india ok" OR "open to india" OR "IST" OR "Asia friendly")',
    tip:'Companies that specifically want IST timezone PMs' },
];

// ─── MESSAGE TEMPLATES ────────────────────────────────────────────────────────
const MESSAGE_TEMPLATES = {
  connectionRequest: [
    { id:'cr1', title:'Fellow PM', context:'Connect with peers',
      message:`Hi [Name],\n\nI came across your profile and was impressed by your work at [Company] on [specific product/feature]. As a fellow PM with [X] years in [domain], I'd love to connect and exchange insights.\n\nLooking forward to connecting!` },
    { id:'cr2', title:'Opportunity Explorer', context:'You\'re job hunting',
      message:`Hi [Name],\n\nI've been following [Company]'s product journey — especially [feature/launch]. As a PM with [X] years in [domain], I'm selectively exploring new opportunities and [Company] is high on my list.\n\nWould love to connect!` },
    { id:'cr3', title:'After Their Post', context:'They shared a PM insight',
      message:`Hi [Name],\n\nYour post on [topic] really resonated — your point about [specific insight] was spot-on from my experience too.\n\nWould love to stay connected and continue the conversation!` },
  ],
  referralRequest: [
    { id:'rr1', title:'Direct Ask', context:'Clear, confident ask',
      message:`Hi [Name],\n\nThank you for connecting! I noticed [Company] is hiring for [Role] — it aligns perfectly with my background.\n\nKey highlights:\n• [Achievement 1 with metric, e.g. "Grew DAU 40% in Q2"]\n• [Achievement 2 with metric]\n• [Domain expertise]\n\nWould you be open to a referral? I'd be happy to share my resume and make it as easy as possible for you.\n\nThank you!` },
    { id:'rr2', title:'Warm Exploration', context:'Test the waters first',
      message:`Hi [Name],\n\nHope you're doing well! [Company] has been on my radar because of [specific reason — product, culture, mission].\n\nI'd love to learn a bit more:\n1. How's the PM team's culture / ways of working?\n2. Are there opportunities suited to [X years] PM experience in [domain]?\n\nIf there's a fit, I'd really value your referral — and I promise to make the process smooth for you.` },
    { id:'rr3', title:'Warm Intro via Mutual', context:'You have a mutual connection',
      message:`Hi [Name],\n\n[Mutual friend's name] suggested I reach out — they spoke highly of you and the PM culture at [Company].\n\nI'm a PM with [X] years in [domain], and I'm exploring opportunities. [Company]'s work on [product area] excites me.\n\nWould you be open to a quick chat, and potentially a referral if there's a fit?` },
  ],
  followUp: [
    { id:'fu1', title:'Gentle Nudge', context:'1 week of silence',
      message:`Hi [Name],\n\nHope you're having a great week! Just following up on my previous note — no pressure at all.\n\nIf you've been swamped, totally understandable. Would love to connect when you have a moment.\n\nBest!` },
    { id:'fu2', title:'Post-Interview Thank You', context:'Within 24hrs of interview',
      message:`Hi [Name],\n\nThank you for the conversation about [Role] — I really enjoyed learning about [specific topic you discussed].\n\nOur discussion reinforced my excitement about [Company]. My experience in [specific skill] feels very aligned with [challenge/goal you discussed].\n\nLooking forward to next steps — please let me know if you need anything else from my end!` },
    { id:'fu3', title:'Status Check', context:'2+ weeks post-application',
      message:`Hi [Name],\n\nI hope you're well! I applied for [Role] [X weeks] ago and wanted to follow up.\n\nI remain very interested — [Company]'s approach to [specific thing] is exactly the kind of challenge I'm looking for.\n\nIs there any update on the timeline? Happy to provide any additional info.` },
  ],
  coldOutreach: [
    { id:'co1', title:'To Hiring Manager', context:'Direct, high-signal',
      message:`Hi [Name],\n\nI noticed you're building the PM team at [Company]. I've been following your product journey, especially [feature/launch you admire].\n\nI'm a PM with [X] years specializing in [domain]:\n• [Achievement 1 — quantified]\n• [Achievement 2 — quantified]\n\nI believe I can help [Company] [specific value you can add].\n\nWould you be open to a 15-min call? No pressure at all.\n\nBest` },
    { id:'co2', title:'To a PM at Target Company', context:'Informational first',
      message:`Hi [Name],\n\nYour journey from [previous role/company] to PM at [Company] is really inspiring!\n\nI'm exploring a transition/move into [Company] and would love 15 minutes to understand what the PM role really looks like day-to-day — not just the JD.\n\nNo ask beyond your time and candid perspective. Would you be open to a quick chat?` },
  ],
};

// ─── REMOTE / INTL STRATEGIES ─────────────────────────────────────────────────
const REMOTE_STRATEGIES = [
  { title:'Top Remote Platforms', icon:'🌍', items:[
    { name:'RemoteOK', url:'https://remoteok.com/remote-product-manager-jobs', tip:'Filter "Worldwide"' },
    { name:'We Work Remotely', url:'https://weworkremotely.com/categories/remote-product-jobs', tip:'Premium remote board' },
    { name:'Remote.co', url:'https://remote.co/remote-jobs/product/', tip:'Curated quality listings' },
    { name:'FlexJobs', url:'https://www.flexjobs.com/search?search=product+manager', tip:'Vetted, no scam listings' },
    { name:'Himalayas', url:'https://himalayas.app/jobs/product-manager', tip:'Growing remote-first board' },
    { name:'NoDesk', url:'https://nodesk.co/remote-jobs/product-manager/', tip:'Curated remote PM roles' },
  ]},
  { title:'Remote-First Companies (Hire Globally)', icon:'🏢', items:[
    { name:'GitLab • Fully async, no office required' },
    { name:'Zapier • Built async-first from day 1' },
    { name:'Automattic (WordPress.com) • 100% distributed' },
    { name:'Buffer • Transparent salaries, global team' },
    { name:'Notion • Growing remote PM team' },
    { name:'Doist (Todoist) • No HQ, global' },
    { name:'Basecamp • Remote-work pioneers' },
    { name:'Hotjar • Europe-based, globally remote' },
  ]},
  { title:'IST-Friendly Global Startups', icon:'🕐', items:[
    { name:'Search YC W25/S25 batch — many hire globally' },
    { name:'Search "APAC timezone" OR "IST" on job boards' },
    { name:'Seek European scale-ups (CET+IST overlap exists)' },
  ]},
];

const INTL_STRATEGIES = {
  us: { title:'🇺🇸 United States', platforms:[
    { name:'Built In', url:'https://builtin.com/jobs/product-management' },
    { name:'Underdog.io', url:'https://underdog.io/' },
    { name:'YC Jobs', url:'https://www.ycombinator.com/jobs/role/product-manager' },
    { name:'LinkedIn US Remote', url:'https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=United%20States&f_WT=2&sortBy=DD' },
  ], tips:['US resume: no photo, no DOB, no marital status','Target Series B+ funded startups for H1B sponsorship','Build US LinkedIn network before applying','Be explicit: "open to relocation, will require H1B"'], sponsors:['Google','Meta','Amazon','Microsoft','Stripe','Airbnb','Uber','Databricks','Confluent','Figma'] },
  uk: { title:'🇬🇧 United Kingdom', platforms:[
    { name:'Welcome to the Jungle (fka Otta)', url:'https://uk.welcometothejungle.com/en/jobs?query=Product%20Manager' },
    { name:'Indeed UK', url:'https://uk.indeed.com/jobs?q=product+manager&sort=date' },
    { name:'TotalJobs', url:'https://www.totaljobs.com/jobs/product-manager' },
  ], tips:['Skilled Worker visa — employer must be licensed sponsor','UK CV: max 2 pages, achievements-led','Mention "eligible for Skilled Worker visa" in cover letter','Fintech & healthtech biggest PM demand'], sponsors:['Revolut','Monzo','Wise','Deliveroo','Checkout.com','OakNorth','Starling Bank'] },
  canada: { title:'🇨🇦 Canada', platforms:[
    { name:'LinkedIn Canada', url:'https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=Canada&sortBy=DD' },
    { name:'Indeed CA', url:'https://ca.indeed.com/jobs?q=product+manager&sort=date' },
    { name:'JobBank', url:'https://www.jobbank.gc.ca/jobsearch/jobposting?searchstring=product+manager' },
  ], tips:['Express Entry draws PMs strongly','Target Toronto, Vancouver, Waterloo tech hubs','Canada PR pathway significantly faster than US GC'], sponsors:['Shopify','RBC','TD Bank','Wealthsimple','PointClickCare'] },
  sg: { title:'🇸🇬 Singapore', platforms:[
    { name:'LinkedIn SG', url:'https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=Singapore&sortBy=DD' },
    { name:'MyCareersFuture', url:'https://www.mycareersfuture.gov.sg/search?search=product+manager&sortBy=new_posting_date' },
  ], tips:['Employment Pass: salary > SGD 5,000/mo needed','No-visa onboarding for many Indian PMs initially','Gateway to SEA market exposure'], sponsors:['Sea Group','Grab','Shopee','DBS','Gojek Singapore'] },
};

// ─── JOB ALERT TIPS ───────────────────────────────────────────────────────────
const ALERT_TIPS = [
  { icon:'🔔', title:'LinkedIn Job Alerts', desc:'Set up "Product Manager" alert for each city — email as-it-happens', url:'https://www.linkedin.com/jobs/search/?keywords=product+manager&location=India&sortBy=DD', tip:'Enable alerts for ALL 8 cities separately — different pools' },
  { icon:'📊', title:'Naukri Job Alerts', desc:'Set daily digest for PM roles — arrives 7 AM IST', url:'https://www.naukri.com/free-job-alerts', tip:'Premium: get alerts before free users see listings' },
  { icon:'🔍', title:'Google Alerts (Free Hack)', desc:'Paste the query below into google.com/alerts — no sign-in required to preview, sign-in to save', url:'https://www.google.com/alerts', tip:'Paste: "product manager" "we are hiring" india — create separate alerts per ATS domain' },
  { icon:'📡', title:'Indeed Email Alert', desc:'Instant notifications when new PM jobs post', url:'https://in.indeed.com/jobs?q=product+manager&l=India&sort=date', tip:'Set frequency to "As they happen" not daily digest' },
  { icon:'⚡', title:'Instahyre Recommendations', desc:'AI matches you automatically when PM roles post', url:'https://www.instahyre.com/search-jobs/?job_types=fulltime&job_titles=Product%20Manager', tip:'Keep profile updated — system auto-notifies employers about you' },
  { icon:'🤖', title:'Job RSS Aggregator (Feedspot)', desc:'Curated feed list of Indian career/job RSS feeds in one reader', url:'https://rss.feedspot.com/indian_career_rss_feeds/', tip:'Naukri retired its public per-role RSS endpoints — this curated list is the current working alternative' },
];

// ─── FIRST-APPLICANT STRATEGY ─────────────────────────────────────────────────
const FIRST_APPLY = [
  { step:'1', icon:'⚡', title:'Apply within 2 hours', desc:'Being in the first 5 applicants means your resume is actually read. After 50+ apps, screeners skim.' },
  { step:'2', icon:'🔔', title:'Set "As it happens" alerts', desc:'LinkedIn, Indeed, Naukri — all support instant alerts. Enable push notifications on mobile apps.' },
  { step:'3', icon:'🌅', title:'Check at 8–9 AM IST daily', desc:'Most Indian job posts go live Monday–Wednesday morning. First-movers win that day.' },
  { step:'4', icon:'📝', title:'Keep your resume ready', desc:'Have 2-3 versions saved (startup, enterprise, general). Edit just the opening line and hit send fast.' },
  { step:'5', icon:'🎯', title:'Apply direct, then referral', desc:'Apply directly first (secures your application date). Then chase a referral to boost it internally.' },
  { step:'6', icon:'🤝', title:'Ping a connection immediately', desc:'Apply → instantly message anyone you know at the company on LinkedIn. Double your chance.' },
];

export default function App() {
  const [theme, setTheme]         = useState('dark');
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRegion, setSelectedRegion] = useState('india');
  const [selectedRole, setSelectedRole]     = useState(ROLES[0].keyword);
  const [selectedLocation, setSelectedLocation] = useState('Bengaluru');
  const [selectedFreshness, setSelectedFreshness] = useState(FRESHNESS_OPTIONS[1]); // default: past 24h
  const [selectedExperience, setSelectedExperience] = useState(EXPERIENCE_LEVELS[0]); // default: any
  const [copiedId, setCopiedId]   = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [hackCategory, setHackCategory]   = useState('all');
  const [isLoaded, setIsLoaded]   = useState(false);
  const [profile, setProfileState] = useState(() => getProfile());
  const [platformMeta, setPlatformMeta] = useState(() => getPlatformMeta());
  const t = themes[theme];

  const trackPlatformClick = (platformId) => setPlatformMeta(markPlatformChecked(platformId));
  const trackPlatformUseful = (platformId, e) => { e.preventDefault(); e.stopPropagation(); setPlatformMeta(markPlatformUseful(platformId)); };

  // Fills the constant parts of a template from the saved profile —
  // recipient-specific brackets ([Name], [Company]) are left for you to fill,
  // since those shouldn't be templated verbatim.
  const fillTemplate = (message) => {
    if (!profile) return message;
    let out = message;
    if (profile.years) {
      out = out.replace(/\[X\] years/g, `${profile.years} years`);
      out = out.replace(/\[X years\]/g, `${profile.years}-year`);
    }
    if (profile.domain) {
      out = out.replace(/\[domain\]/g, profile.domain);
      out = out.replace(/\[Domain expertise\]/g, `${profile.domain} expertise`);
    }
    const achievements = (profile.achievements || []).filter(Boolean);
    if (achievements[0]) {
      out = out.replace(/\[Achievement 1 with metric, e\.g\. "Grew DAU 40% in Q2"\]/g, achievements[0]);
      out = out.replace(/\[Achievement 1 — quantified\]/g, achievements[0]);
    }
    if (achievements[1]) {
      out = out.replace(/\[Achievement 2 with metric\]/g, achievements[1]);
      out = out.replace(/\[Achievement 2 — quantified\]/g, achievements[1]);
    }
    return out;
  };

  useEffect(() => { setIsLoaded(true); }, []);

  const copyToClipboard = useCallback((text, id) => {
    navigator.clipboard.writeText(text).catch(() => {}).finally(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const toggleSection = (id) => setExpandedSections(p => ({ ...p, [id]: !p[id] }));
  const openMultiple  = (urls) => urls.forEach((u, i) => setTimeout(() => window.open(u, '_blank', 'noopener'), i * 350));

  // Style helpers
  const card = {
    background: t.cardBg, backdropFilter: 'blur(20px)',
    border: `1px solid ${t.border}`, borderRadius: '20px',
    padding: '24px', transition: 'all 0.3s cubic-bezier(0.25,0.1,0.25,1)'
  };
  const btnPrimary = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'10px',
    padding:'14px 28px', background:t.accent, border:'none', borderRadius:'980px',
    color:'#fff', fontSize:'16px', fontWeight:'500', cursor:'pointer',
    transition:'all 0.3s cubic-bezier(0.25,0.1,0.25,1)',
    boxShadow:`0 4px 24px ${t.accentGlow}`, textDecoration:'none'
  };
  const btnSecondary = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'8px',
    padding:'11px 22px', background:t.cardBg, border:`1px solid ${t.border}`,
    borderRadius:'980px', color:t.text, fontSize:'14px', fontWeight:'500',
    cursor:'pointer', transition:'all 0.2s ease', textDecoration:'none'
  };
  const tabStyle = (active) => ({
    padding:'9px 18px', background:active ? t.accent : 'transparent', border:'none',
    borderRadius:'980px', color:active ? '#fff' : t.textSecondary, fontSize:'13px',
    fontWeight:'500', cursor:'pointer', transition:'all 0.2s ease',
    display:'flex', alignItems:'center', gap:'7px', whiteSpace:'nowrap'
  });
  const badge = (color, bg) => ({
    padding:'3px 8px', borderRadius:'8px', fontSize:'10px', fontWeight:'700',
    letterSpacing:'0.5px', color:color, background:bg
  });

  // ── filtered platforms
  const filteredPlatforms = Object.entries(PLATFORMS)
    .filter(([,p]) =>
      selectedRegion === 'india'  ? (p.region === 'india' || p.region === 'global') :
      selectedRegion === 'remote' ? (p.region === 'remote' || p.region === 'global') :
      selectedRegion === 'intl'   ? (p.region === 'us' || p.region === 'global') : true
    )
    .sort((a,b) => a[1].priority - b[1].priority);

  const filteredHacks = hackCategory === 'all' ? GOOGLE_HACKS : GOOGLE_HACKS.filter(h => h.category === hackCategory);
  const filterOpts = { freshness: selectedFreshness, experience: selectedExperience };

  const HACK_CATEGORIES = [
    { id:'all',      label:'All Hacks',    icon:'🔮' },
    { id:'speed',    label:'Be First',     icon:'⚡' },
    { id:'hidden',   label:'Hidden Jobs',  icon:'🕵️' },
    { id:'senior',   label:'Senior PM',    icon:'🎖️' },
    { id:'referral', label:'Referrals',    icon:'🤝' },
    { id:'remote',   label:'Remote',       icon:'🌍' },
  ];

  // Quick-launch URLs: built live from PLATFORMS so they always reflect the
  // current role (Product Manager vs Senior PM) and city — the old version
  // was a static list hardcoded to "Product Manager" regardless of toggle.
  const getQuickLaunchUrls = (region, role, location, opts) => {
    const wantsRegion = ([p]) =>
      region==='india'  ? (p.region==='india'  || p.region==='global') :
      region==='remote' ? (p.region==='remote' || p.region==='global') :
                           (p.region==='us'     || p.region==='global');
    return Object.entries(PLATFORMS)
      .filter(wantsRegion)
      .sort((a,b) => a[1].priority - b[1].priority)
      .slice(0, 6)
      .map(([,p]) => p.getUrl(role, region==='india' ? location : '', { ...opts, region }));
  };

  return (
    <div style={{ minHeight:'100vh', background:t.bg, color:t.text, fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,sans-serif', transition:'background 0.5s ease,color 0.3s ease' }}>
      {/* Hero glow */}
      <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:t.heroGradient, pointerEvents:'none', zIndex:0, opacity:isLoaded?1:0, transition:'opacity 1s ease' }} />

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:1000, backdropFilter:t.glassEffect, WebkitBackdropFilter:t.glassEffect, background:theme==='dark'?'rgba(0,0,0,0.75)':'rgba(255,255,255,0.75)', borderBottom:`0.5px solid ${t.border}` }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:t.gradient1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', boxShadow:'0 4px 12px rgba(102,126,234,0.4)' }}>🎯</div>
            <div>
              <h1 style={{ margin:0, fontSize:'19px', fontWeight:'600', letterSpacing:'-0.3px' }}>PM Jobs Tracker</h1>
              <p style={{ margin:0, fontSize:'11px', color:t.textSecondary }}>26 platforms • updated daily</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ display:'flex', gap:'6px', padding:'4px 8px', background:t.cardBg, border:`1px solid ${t.border}`, borderRadius:'12px' }}>
              {ROLES.map(r => (
                <button key={r.keyword} onClick={()=>setSelectedRole(r.keyword)} style={{ padding:'6px 12px', borderRadius:'8px', border:'none', background:selectedRole===r.keyword?t.accent:'transparent', color:selectedRole===r.keyword?'#fff':t.textSecondary, fontSize:'12px', fontWeight:'500', cursor:'pointer' }}>{r.label}</button>
              ))}
            </div>
            <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} style={{ width:'40px', height:'40px', borderRadius:'50%', background:t.cardBg, border:`1px solid ${t.border}`, color:t.text, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}
            </button>
          </div>
        </div>
      </nav>

      {/* TABS */}
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'16px 24px 0', display:'flex', gap:'6px', overflowX:'auto', position:'relative', zIndex:10 }}>
        {[
          { id:'home',      icon:<Sparkles size={14}/>,   label:'Home' },
          { id:'jobs',      icon:<Briefcase size={14}/>,  label:'All Jobs' },
          { id:'tracker',   icon:<ClipboardList size={14}/>, label:'Tracker' },
          { id:'watchlist', icon:<Building2 size={14}/>,  label:'Watchlist' },
          { id:'resumematch',icon:<FileSearch size={14}/>,label:'Resume Match' },
          { id:'hacks',     icon:<Lightbulb size={14}/>,  label:'Hacks' },
          { id:'alerts',    icon:<Bell size={14}/>,        label:'Alerts' },
          { id:'firstapply',icon:<Zap size={14}/>,         label:'Be First' },
          { id:'remote',    icon:<Globe size={14}/>,       label:'Remote' },
          { id:'intl',      icon:<Target size={14}/>,      label:'US/UK/CA/SG' },
          { id:'templates', icon:<MessageSquare size={14}/>, label:'Templates' },
        ].map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={tabStyle(activeTab===tab.id)}>{tab.icon}{tab.label}</button>
        ))}
      </div>

      {/* MAIN */}
      <main style={{ maxWidth:'1200px', margin:'0 auto', padding:'24px 24px 80px', position:'relative', zIndex:10 }}>

        {/* ── HOME ── */}
        {activeTab==='home' && (
          <div style={{ opacity:isLoaded?1:0, transform:isLoaded?'translateY(0)':'translateY(20px)', transition:'all 0.8s cubic-bezier(0.25,0.1,0.25,1)' }}>
            <section style={{ textAlign:'center', padding:'60px 0 72px' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'7px 16px', background:theme==='dark'?'rgba(48,209,88,0.15)':'rgba(52,199,89,0.1)', borderRadius:'980px', marginBottom:'24px' }}>
                <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:t.success, animation:'pulse 2s infinite' }}/>
                <span style={{ fontSize:'13px', color:t.success, fontWeight:'600' }}>Live • 26 platforms connected</span>
              </div>
              <h1 style={{ fontSize:'clamp(44px,10vw,80px)', fontWeight:'700', letterSpacing:'-0.04em', lineHeight:'1.05', margin:'0 0 24px', background:theme==='dark'?'linear-gradient(180deg,#fff 0%,rgba(255,255,255,0.7) 100%)':'linear-gradient(180deg,#1d1d1f 0%,rgba(29,29,31,0.8) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                Find every PM job.<br/><span style={{ background:t.gradient3, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Apply first. Win.</span>
              </h1>
              <p style={{ fontSize:'20px', color:t.textSecondary, lineHeight:'1.6', maxWidth:'580px', margin:'0 auto 40px', fontWeight:'400' }}>
                26 platforms • 18 Google hacks • Alert systems •<br/>LinkedIn templates. Everything to land your next PM role.
              </p>
              <div style={{ display:'flex', gap:'14px', justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={()=>openMultiple(getQuickLaunchUrls('india', selectedRole, selectedLocation, filterOpts))} style={btnPrimary}><Zap size={18}/>Open All India Platforms<ArrowRight size={16}/></button>
                <button onClick={()=>setActiveTab('hacks')} style={btnSecondary}><Lightbulb size={16}/>Unlock Hacks</button>
              </div>
            </section>

            {/* Stats */}
            <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'16px', marginBottom:'72px' }}>
              {[
                { n:'26+', label:'Job Platforms',    icon:<Briefcase size={22}/>, g:t.gradient1 },
                { n:'18',  label:'Search Hacks',     icon:<Lightbulb size={22}/>, g:t.gradient5 },
                { n:'12',  label:'Indian Cities',    icon:<MapPin size={22}/>,    g:t.gradient4 },
                { n:'6',   label:'Alert Systems',    icon:<Bell size={22}/>,      g:t.gradient3 },
                { n:'10+', label:'Templates',        icon:<MessageSquare size={22}/>, g:t.gradient2 },
                { n:'4',   label:'Countries',        icon:<Globe size={22}/>,     g:'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)' },
              ].map((s,i) => (
                <div key={i} style={{ ...card, textAlign:'center', padding:'28px 20px', opacity:isLoaded?1:0, transform:isLoaded?'translateY(0)':'translateY(20px)', transition:`all 0.6s cubic-bezier(0.25,0.1,0.25,1) ${i*0.08}s` }}>
                  <div style={{ width:'50px', height:'50px', borderRadius:'14px', background:s.g, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', color:'#fff' }}>{s.icon}</div>
                  <div style={{ fontSize:'32px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'4px' }}>{s.n}</div>
                  <div style={{ fontSize:'13px', color:t.textSecondary }}>{s.label}</div>
                </div>
              ))}
            </section>

            {/* Feature cards */}
            <section style={{ marginBottom:'72px' }}>
              <h2 style={{ fontSize:'30px', fontWeight:'700', letterSpacing:'-0.02em', textAlign:'center', marginBottom:'40px' }}>Your complete PM job toolkit</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'20px' }}>
                {[
                  { title:'All Job Platforms', desc:'26 boards — Indian, global, remote, startup. Sorted newest first.', icon:'💼', tab:'jobs', color:t.gradient1 },
                  { title:'Google Hacks',       desc:'18 secret queries to find unlisted jobs in ATS and direct career pages.', icon:'🔍', tab:'hacks', color:t.gradient5 },
                  { title:'Alert Setup',        desc:'Set up 6 real-time alert systems so new jobs reach YOU first.', icon:'🔔', tab:'alerts', color:t.gradient3 },
                  { title:'Be First to Apply',  desc:'Step-by-step strategy to be in the top 5 applicants every time.', icon:'⚡', tab:'firstapply', color:t.gradient2 },
                  { title:'Remote & International', desc:'Remote boards, IST-friendly companies, US/UK/Canada/Singapore.', icon:'🌍', tab:'remote', color:t.gradient4 },
                  { title:'LinkedIn Templates', desc:'Copy-paste messages for connections, referrals, cold outreach.', icon:'💬', tab:'templates', color:'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)' },
                ].map((f,i) => (
                  <button key={i} onClick={()=>setActiveTab(f.tab)} style={{ ...card, textAlign:'left', cursor:'pointer', opacity:isLoaded?1:0, transform:isLoaded?'translateY(0)':'translateY(20px)', transition:`all 0.6s cubic-bezier(0.25,0.1,0.25,1) ${i*0.08+0.2}s` }}>
                    <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:f.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', marginBottom:'16px' }}>{f.icon}</div>
                    <h3 style={{ margin:'0 0 8px', fontSize:'18px', fontWeight:'600' }}>{f.title}</h3>
                    <p style={{ margin:'0 0 16px', fontSize:'14px', color:t.textSecondary, lineHeight:'1.6' }}>{f.desc}</p>
                    <div style={{ color:t.accent, fontSize:'13px', fontWeight:'500', display:'flex', alignItems:'center', gap:'4px' }}>Explore <ArrowRight size={13}/></div>
                  </button>
                ))}
              </div>
            </section>

            {/* Pro tip */}
            <div style={{ ...card, background:theme==='dark'?'linear-gradient(135deg,rgba(255,214,10,0.1) 0%,rgba(255,149,0,0.1) 100%)':'linear-gradient(135deg,rgba(255,214,10,0.08) 0%,rgba(255,149,0,0.08) 100%)', padding:'36px', textAlign:'center' }}>
              <Award size={36} style={{ color:t.warning, marginBottom:'12px' }}/>
              <h3 style={{ margin:'0 0 10px', fontSize:'22px', fontWeight:'600' }}>The #1 Proven Tactic</h3>
              <p style={{ margin:'0 auto 24px', fontSize:'17px', color:t.textSecondary, maxWidth:'500px', lineHeight:'1.6' }}>Applying in the <strong style={{ color:t.text }}>first 10 applicants</strong> makes you <strong style={{ color:t.text }}>4x more likely</strong> to hear back. Set alerts → apply same hour → chase referral.</p>
              <button onClick={()=>setActiveTab('firstapply')} style={btnPrimary}><Zap size={16}/>See the "Be First" Strategy</button>
            </div>
          </div>
        )}

        {/* ── JOBS ── */}
        {activeTab==='jobs' && (
          <div>
            <div style={{ display:'flex', gap:'10px', marginBottom:'28px', flexWrap:'wrap' }}>
              {[{id:'india',label:'🇮🇳 India',desc:'12 cities'},{id:'remote',label:'🌍 Remote',desc:'Work anywhere'},{id:'intl',label:'🌐 International',desc:'Global reach — see US/UK/CA/SG tab for per-country detail'}].map(r => (
                <button key={r.id} onClick={()=>setSelectedRegion(r.id)} style={{ padding:'18px 24px', background:selectedRegion===r.id?t.accent:t.cardBg, border:`1px solid ${selectedRegion===r.id?t.accent:t.border}`, borderRadius:'16px', color:selectedRegion===r.id?'#fff':t.text, cursor:'pointer', textAlign:'left', transition:'all 0.2s ease' }}>
                  <div style={{ fontSize:'17px', fontWeight:'600', marginBottom:'3px' }}>{r.label}</div>
                  <div style={{ fontSize:'12px', opacity:0.7 }}>{r.desc}</div>
                </button>
              ))}
            </div>

            {/* Quick Launch */}
            <div style={{ ...card, marginBottom:'28px', background:theme==='dark'?'linear-gradient(135deg,rgba(10,132,255,0.12) 0%,rgba(102,126,234,0.12) 100%)':'linear-gradient(135deg,rgba(0,113,227,0.06) 0%,rgba(102,126,234,0.06) 100%)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'16px' }}>
                <div>
                  <h3 style={{ margin:'0 0 4px', fontSize:'17px', fontWeight:'600' }}>⚡ Quick Launch</h3>
                  <p style={{ margin:0, fontSize:'13px', color:t.textSecondary }}>Open top platforms for <strong>{selectedRole}</strong>{selectedRegion==='india'?<> in <strong>{selectedLocation}</strong></>:null} — newest first</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                  {selectedRegion==='india' && (
                    <select value={selectedLocation} onChange={e=>setSelectedLocation(e.target.value)} style={{ padding:'10px 14px', borderRadius:'980px', border:`1px solid ${t.border}`, background:t.cardBg, color:t.text, fontSize:'13px', cursor:'pointer' }}>
                      {INDIA_LOCATIONS.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                  )}
                  <button onClick={()=>openMultiple(getQuickLaunchUrls(selectedRegion, selectedRole, selectedLocation, filterOpts))} style={btnPrimary}><Rocket size={16}/>Launch All</button>
                </div>
              </div>
            </div>

            {/* Filters — only LinkedIn / Naukri / Indeed honor these (see FRESHNESS_OPTIONS / EXPERIENCE_LEVELS comments); every other board has no documented equivalent param */}
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'20px' }}>
              <div>
                <div style={{ fontSize:'11px', color:t.textSecondary, marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Posted</div>
                <select value={selectedFreshness.id} onChange={e=>setSelectedFreshness(FRESHNESS_OPTIONS.find(f=>f.id===e.target.value))} style={{ padding:'9px 14px', borderRadius:'980px', border:`1px solid ${t.border}`, background:t.cardBg, color:t.text, fontSize:'13px', cursor:'pointer' }}>
                  {FRESHNESS_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'11px', color:t.textSecondary, marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Experience</div>
                <select value={selectedExperience.id} onChange={e=>setSelectedExperience(EXPERIENCE_LEVELS.find(x=>x.id===e.target.value))} style={{ padding:'9px 14px', borderRadius:'980px', border:`1px solid ${t.border}`, background:t.cardBg, color:t.text, fontSize:'13px', cursor:'pointer' }}>
                  {EXPERIENCE_LEVELS.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
              </div>
              <p style={{ alignSelf:'flex-end', fontSize:'11px', color:t.textTertiary, margin:'0 0 4px' }}>Applied on LinkedIn, Naukri &amp; Indeed only — other boards don't expose these as URL filters</p>
            </div>

            {/* Platform grid */}
            <h3 style={{ margin:'0 0 16px', fontSize:'18px', fontWeight:'600' }}>
              {selectedRegion==='india'?'🇮🇳 Indian & Global Platforms':selectedRegion==='remote'?'🌍 Remote Platforms':'🌐 International Platforms'}
              <span style={{ marginLeft:'10px', fontSize:'13px', color:t.textSecondary, fontWeight:'400' }}>{filteredPlatforms.length} platforms</span>
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:'12px', marginBottom:'48px' }}>
              {filteredPlatforms.map(([id, p]) => {
                const meta = platformMeta[id] || {};
                return (
                <a key={id} href={p.getUrl(selectedRole, selectedRegion==='india'?selectedLocation:'', { ...filterOpts, region:selectedRegion })} target="_blank" rel="noopener noreferrer"
                  onClick={()=>trackPlatformClick(id)}
                  style={{ ...card, textDecoration:'none', color:t.text, display:'flex', alignItems:'center', gap:'14px', padding:'18px 20px' }}>
                  <span style={{ fontSize:'28px', flexShrink:0 }}>{p.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                      <span style={{ fontSize:'15px', fontWeight:'600' }}>{p.name}</span>
                      {p.badge && <span style={{ ...badge(t.badgeText, t.badgeBg), fontSize:'9px' }}>{p.badge}</span>}
                    </div>
                    <div style={{ fontSize:'12px', color:t.textSecondary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.description}</div>
                    <div style={{ fontSize:'10px', color:t.textTertiary, marginTop:'3px' }}>
                      {meta.lastChecked ? `Checked ${timeAgo(meta.lastChecked)}` : 'Not checked yet'}
                      {meta.usefulCount ? ` • 👍 ${meta.usefulCount}` : ''}
                    </div>
                  </div>
                  <button onClick={(e)=>trackPlatformUseful(id,e)} title="Mark this platform as having gotten you a response" style={{ background:'none', border:`1px solid ${t.border}`, borderRadius:'8px', padding:'6px', color:t.textTertiary, cursor:'pointer', flexShrink:0 }}>
                    <ThumbsUp size={13}/>
                  </button>
                  <ExternalLink size={15} style={{ color:t.textTertiary, flexShrink:0 }}/>
                </a>
              );})}
            </div>

            {/* City search */}
            {selectedRegion==='india' && (<>
              <h3 style={{ margin:'0 0 16px', fontSize:'18px', fontWeight:'600' }}>📍 Search by City on LinkedIn</h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:'10px', marginBottom:'32px' }}>
                {INDIA_LOCATIONS.map(l => (
                  <a key={l.id} href={PLATFORMS.linkedin.getUrl(selectedRole, l.name, { ...filterOpts, region:'india' })} target="_blank" rel="noopener noreferrer"
                    style={{ ...card, textDecoration:'none', color:t.text, textAlign:'center', padding:'18px 14px' }}>
                    <MapPin size={18} style={{ color:t.accent, marginBottom:'7px' }}/>
                    <div style={{ fontSize:'14px', fontWeight:'500' }}>{l.name}</div>
                  </a>
                ))}
              </div>

              {/* Naukri city search */}
              <h3 style={{ margin:'0 0 16px', fontSize:'18px', fontWeight:'600' }}>🔵 Naukri by City</h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:'10px' }}>
                {INDIA_LOCATIONS.map(l => (
                  <a key={l.id} href={PLATFORMS.naukri.getUrl(selectedRole, l.name, { ...filterOpts, region:'india' })} target="_blank" rel="noopener noreferrer"
                    style={{ ...card, textDecoration:'none', color:t.text, textAlign:'center', padding:'18px 14px', borderColor:'rgba(74,103,255,0.3)' }}>
                    <span style={{ fontSize:'18px', display:'block', marginBottom:'7px' }}>🔵</span>
                    <div style={{ fontSize:'14px', fontWeight:'500' }}>{l.name}</div>
                  </a>
                ))}
              </div>
            </>)}
          </div>
        )}

        {/* ── TRACKER ── */}
        {activeTab==='tracker' && <Tracker t={t} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary} />}

        {/* ── WATCHLIST ── */}
        {activeTab==='watchlist' && <Watchlist t={t} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary} profile={profile} />}

        {/* ── RESUME MATCH ── */}
        {activeTab==='resumematch' && <ResumeMatch t={t} card={card} />}

        {/* ── HACKS ── */}
        {activeTab==='hacks' && (
          <div>
            <div style={{ textAlign:'center', marginBottom:'40px' }}>
              <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>18 Google Search Hacks</h2>
              <p style={{ fontSize:'16px', color:t.textSecondary, maxWidth:'520px', margin:'0 auto' }}>Discover jobs before they hit job boards. Find hidden listings, referral opportunities, and salary-transparent roles.</p>
            </div>

            {/* Category filters */}
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'28px' }}>
              {HACK_CATEGORIES.map(c => (
                <button key={c.id} onClick={()=>setHackCategory(c.id)} style={{ padding:'8px 16px', background:hackCategory===c.id?t.accent:t.cardBg, border:`1px solid ${hackCategory===c.id?t.accent:t.border}`, borderRadius:'980px', color:hackCategory===c.id?'#fff':t.text, fontSize:'13px', fontWeight:'500', cursor:'pointer', transition:'all 0.2s ease' }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            <div style={{ display:'grid', gap:'14px' }}>
              {filteredHacks.map((h,i) => (
                <div key={h.id} style={{ ...card, opacity:isLoaded?1:0, transform:isLoaded?'translateY(0)':'translateY(10px)', transition:`all 0.4s ease ${i*0.04}s` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px', flexWrap:'wrap', gap:'14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <span style={{ fontSize:'26px' }}>{h.icon}</span>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                          <h3 style={{ margin:0, fontSize:'16px', fontWeight:'600' }}>{h.title}</h3>
                          {h.badge && <span style={{ ...badge(theme==='dark'?'#FFD60A':'#92400e','rgba(255,214,10,0.18)') }}>{h.badge}</span>}
                        </div>
                        <p style={{ margin:0, fontSize:'12px', color:t.textSecondary }}>{h.tip}</p>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
                      {h.googleJobsUrl && (
                        <button onClick={()=>window.open(h.googleJobsUrl,'_blank')} style={{ ...btnSecondary, padding:'9px 16px', fontSize:'12px' }}><Search size={13}/>Google Jobs</button>
                      )}
                      <button onClick={()=>window.open('https://www.google.com/search?q='+encodeURIComponent(h.query)+(h.timeFilter?'&tbs=qdr:d':''),'_blank')} style={{ ...btnPrimary, padding:'9px 18px', fontSize:'13px' }}><Search size={14}/>Search Now</button>
                    </div>
                  </div>
                  <div style={{ background:t.codeBg, padding:'12px 16px', borderRadius:'10px', fontFamily:'SF Mono,Monaco,Consolas,monospace', fontSize:'11.5px', color:t.codeColor, overflowX:'auto', whiteSpace:'nowrap' }}>
                    {h.query}{h.timeFilter && <span style={{ color:t.textTertiary }}> [Filter: Past 24 hours]</span>}
                  </div>
                  <button onClick={()=>copyToClipboard(h.query, h.id+'-copy')} style={{ ...btnSecondary, marginTop:'10px', padding:'7px 14px', fontSize:'12px' }}>
                    {copiedId===h.id+'-copy'?<><Check size={12}/> Copied!</>:<><Copy size={12}/> Copy query</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ALERTS ── */}
        {activeTab==='alerts' && (
          <div>
            <div style={{ textAlign:'center', marginBottom:'40px' }}>
              <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>Job Alert Systems</h2>
              <p style={{ fontSize:'16px', color:t.textSecondary, maxWidth:'520px', margin:'0 auto' }}>Set up these 6 alert channels so new PM jobs come to you — be in the first 10 applicants automatically.</p>
            </div>
            <div style={{ display:'grid', gap:'14px', marginBottom:'48px' }}>
              {ALERT_TIPS.map((a,i) => (
                <div key={i} style={{ ...card, display:'flex', alignItems:'flex-start', gap:'20px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'32px', flexShrink:0 }}>{a.icon}</span>
                  <div style={{ flex:1, minWidth:'200px' }}>
                    <h3 style={{ margin:'0 0 4px', fontSize:'16px', fontWeight:'600' }}>{a.title}</h3>
                    <p style={{ margin:'0 0 8px', fontSize:'14px', color:t.textSecondary }}>{a.desc}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background:theme==='dark'?'rgba(48,209,88,0.1)':'rgba(52,199,89,0.08)', borderRadius:'8px', fontSize:'12px', color:t.success, marginBottom:'12px', width:'fit-content' }}>
                      <Star size={11}/> {a.tip}
                    </div>
                  </div>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, padding:'10px 20px', fontSize:'13px', flexShrink:0 }}>Set Up <ExternalLink size={13}/></a>
                </div>
              ))}
            </div>

            <div style={{ ...card, background:theme==='dark'?'linear-gradient(135deg,rgba(10,132,255,0.1) 0%,rgba(102,126,234,0.1) 100%)':'linear-gradient(135deg,rgba(0,113,227,0.06) 0%,rgba(102,126,234,0.06) 100%)', padding:'32px', textAlign:'center' }}>
              <Bell size={32} style={{ color:t.accent, marginBottom:'12px' }}/>
              <h3 style={{ margin:'0 0 10px', fontSize:'20px', fontWeight:'600' }}>Pro tip: Stack your alerts</h3>
              <p style={{ margin:'0 auto', fontSize:'16px', color:t.textSecondary, maxWidth:'480px', lineHeight:'1.6' }}>Set up <strong style={{ color:t.text }}>all 6 alert systems</strong> independently. Each surface different jobs — you'll catch listings others miss entirely.</p>
            </div>
          </div>
        )}

        {/* ── BE FIRST ── */}
        {activeTab==='firstapply' && (
          <div>
            <div style={{ textAlign:'center', marginBottom:'40px' }}>
              <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>Be First to Apply</h2>
              <p style={{ fontSize:'16px', color:t.textSecondary, maxWidth:'520px', margin:'0 auto' }}>A systematic 6-step approach to consistently be in the top 5 applicants — where your resume actually gets read.</p>
            </div>

            <div style={{ display:'grid', gap:'14px', marginBottom:'48px' }}>
              {FIRST_APPLY.map((s,i) => (
                <div key={i} style={{ ...card, display:'flex', alignItems:'flex-start', gap:'20px' }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'14px', background:t.gradient1, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'18px', fontWeight:'700', color:'#fff' }}>{s.step}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                      <span style={{ fontSize:'20px' }}>{s.icon}</span>
                      <h3 style={{ margin:0, fontSize:'16px', fontWeight:'600' }}>{s.title}</h3>
                    </div>
                    <p style={{ margin:0, fontSize:'14px', color:t.textSecondary, lineHeight:'1.6' }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick checklist */}
            <div style={{ ...card, padding:'32px' }}>
              <h3 style={{ margin:'0 0 20px', fontSize:'18px', fontWeight:'600' }}>⚡ Today's Action Checklist</h3>
              <div style={{ display:'grid', gap:'10px' }}>
                {[
                  'Set LinkedIn job alert → "As it happens" (not daily)',
                  'Set Naukri job alert with same role & city filters',
                  'Create Google Alert: "product manager" "we are hiring" india',
                  'Enable push notifications on LinkedIn + Naukri mobile apps',
                  'Prepare 2 resume versions: startup-focused & enterprise-focused',
                  'Draft 1 cover email template — personalize just the first 2 lines fast',
                  'Write a shortlist of 20 target companies — check their careers pages weekly',
                  'Connect with 5 PMs at your target companies on LinkedIn this week',
                ].map((item,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px 16px', background:t.inlineBg, borderRadius:'12px', border:`1px solid ${t.border}` }}>
                    <div style={{ width:'22px', height:'22px', borderRadius:'6px', border:`2px solid ${t.border}`, flexShrink:0, marginTop:'1px' }}/>
                    <span style={{ fontSize:'14px', lineHeight:'1.5' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── REMOTE ── */}
        {activeTab==='remote' && (
          <div>
            <div style={{ textAlign:'center', marginBottom:'40px' }}>
              <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>Remote & International</h2>
              <p style={{ fontSize:'16px', color:t.textSecondary }}>Work from India for global companies — full-time remote, not just contract</p>
            </div>
            {REMOTE_STRATEGIES.map((section,i) => (
              <div key={i} style={{ ...card, marginBottom:'20px' }}>
                <h3 style={{ margin:'0 0 18px', fontSize:'17px', fontWeight:'600', display:'flex', alignItems:'center', gap:'10px' }}><span style={{ fontSize:'22px' }}>{section.icon}</span>{section.title}</h3>
                <div style={{ display:'grid', gap:'8px' }}>
                  {section.items.map((item,j) => (
                    <div key={j} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:t.inlineBg, borderRadius:'12px', gap:'12px', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'14px' }}>{item.name}{item.tip && <span style={{ color:t.textSecondary }}> — {item.tip}</span>}</span>
                      {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'7px 14px', fontSize:'12px' }}>Open <ExternalLink size={11}/></a>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── INTL ── */}
        {activeTab==='intl' && (
          <div>
            <div style={{ textAlign:'center', marginBottom:'40px' }}>
              <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>US • UK • Canada • Singapore</h2>
              <p style={{ fontSize:'16px', color:t.textSecondary }}>Strategies + sponsor-friendly companies for international PM roles</p>
            </div>
            {Object.entries(INTL_STRATEGIES).map(([key,data]) => (
              <div key={key} style={{ ...card, marginBottom:'20px' }}>
                <h3 style={{ margin:'0 0 20px', fontSize:'20px', fontWeight:'600' }}>{data.title}</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'20px' }}>
                  <div>
                    <h4 style={{ margin:'0 0 12px', fontSize:'12px', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.5px' }}>Platforms</h4>
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                      {data.platforms.map((p,i) => <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, justifyContent:'flex-start', fontSize:'13px' }}>{p.name} <ExternalLink size={12}/></a>)}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ margin:'0 0 12px', fontSize:'12px', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.5px' }}>Tips</h4>
                    <div style={{ display:'grid', gap:'7px' }}>
                      {data.tips.map((tip,i) => <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'13px' }}><Star size={12} style={{ color:t.warning, marginTop:'2px', flexShrink:0 }}/>{tip}</div>)}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ margin:'0 0 12px', fontSize:'12px', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.5px' }}>Sponsor-Friendly</h4>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                      {data.sponsors.map((c,i) => <span key={i} style={{ padding:'5px 10px', background:t.inlineBg, border:`1px solid ${t.border}`, borderRadius:'8px', fontSize:'12px', color:t.text }}>{c}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TEMPLATES ── */}
        {activeTab==='templates' && (
          <div>
            <div style={{ textAlign:'center', marginBottom:'40px' }}>
              <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>LinkedIn Templates</h2>
              <p style={{ fontSize:'16px', color:t.textSecondary }}>Copy-paste messages — customize the [brackets], send in seconds</p>
            </div>
            <ProfileEditor t={t} card={card} btnPrimary={btnPrimary} profile={profile} onChange={setProfileState} />
            {Object.entries(MESSAGE_TEMPLATES).map(([cat,temps]) => (
              <div key={cat} style={{ marginBottom:'16px' }}>
                <button onClick={()=>toggleSection(cat)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', background:t.cardBg, border:`1px solid ${t.border}`, borderRadius:expandedSections[cat]?'16px 16px 0 0':'16px', color:t.text, cursor:'pointer', fontSize:'15px', fontWeight:'600', transition:'all 0.2s ease' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    {cat==='connectionRequest'&&<Users size={18}/>}{cat==='referralRequest'&&<Star size={18}/>}{cat==='followUp'&&<Clock size={18}/>}{cat==='coldOutreach'&&<Mail size={18}/>}
                    {cat.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}
                    <span style={{ padding:'3px 9px', background:t.accent, borderRadius:'10px', fontSize:'11px', color:'#fff' }}>{temps.length}</span>
                  </span>
                  {expandedSections[cat]?<ChevronUp size={18}/>:<ChevronDown size={18}/>}
                </button>
                {expandedSections[cat] && (
                  <div style={{ border:`1px solid ${t.border}`, borderTop:'none', borderRadius:'0 0 16px 16px', overflow:'hidden' }}>
                    {temps.map((tmpl,i) => (
                      <div key={tmpl.id} style={{ padding:'22px', borderBottom:i<temps.length-1?`1px solid ${t.border}`:'none', background:t.templateBg, color:t.text }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px', flexWrap:'wrap', gap:'10px' }}>
                          <div>
                            <h4 style={{ margin:'0 0 3px', fontSize:'15px', fontWeight:'600' }}>{tmpl.title}</h4>
                            <p style={{ margin:0, fontSize:'12px', color:t.textSecondary }}>{tmpl.context}</p>
                          </div>
                          <button onClick={()=>copyToClipboard(fillTemplate(tmpl.message),tmpl.id)} style={{ ...btnPrimary, padding:'9px 16px', fontSize:'13px', background:copiedId===tmpl.id?t.success:t.accent }}>
                            {copiedId===tmpl.id?<><Check size={14}/> Copied!</>:<><Copy size={14}/> Copy</>}
                          </button>
                        </div>
                        <div style={{ padding:'16px', background:t.codeBg, borderRadius:'12px', fontSize:'13px', lineHeight:'1.75', whiteSpace:'pre-wrap', color:t.text }}>{fillTemplate(tmpl.message)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </main>

      <footer style={{ borderTop:`1px solid ${t.border}`, padding:'20px', textAlign:'center', position:'relative', zIndex:10 }}>
        <p style={{ fontSize:'12px', color:t.textSecondary, margin:0 }}>PM Jobs Tracker • 26 platforms • Built for Product Managers in India 🇮🇳</p>
      </footer>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.6;transform:scale(0.9);}}
        ::-webkit-scrollbar{width:8px;height:8px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${t.border};border-radius:4px;}
        ::-webkit-scrollbar-thumb:hover{background:${t.textTertiary};}
        ::selection{background:${t.accent};color:#fff;}
        a:hover,button:hover{opacity:0.88;}
      `}</style>
    </div>
  );
}
