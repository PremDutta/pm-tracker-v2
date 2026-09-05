export const REMOTE_STRATEGIES = [
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

export const INTL_STRATEGIES = {
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
