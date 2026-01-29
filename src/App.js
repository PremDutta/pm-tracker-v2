import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, ExternalLink, Zap, Globe, Copy, Check, Briefcase, Target, Lightbulb, MessageSquare, Users, Clock, Star, BookOpen, ChevronDown, ChevronUp, Mail, Sun, Moon, Sparkles, ArrowRight, TrendingUp, Award, Rocket } from 'lucide-react';

const themes = {
  dark: {
    name: 'dark',
    bg: '#000000',
    bgSecondary: '#0a0a0a',
    surface: 'rgba(28, 28, 30, 0.8)',
    surfaceHover: 'rgba(44, 44, 46, 0.9)',
    surfaceSolid: '#1c1c1e',
    border: 'rgba(255, 255, 255, 0.1)',
    borderHover: 'rgba(255, 255, 255, 0.2)',
    text: '#f5f5f7',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textTertiary: 'rgba(255, 255, 255, 0.4)',
    accent: '#0A84FF',
    accentHover: '#409CFF',
    accentGlow: 'rgba(10, 132, 255, 0.3)',
    success: '#30D158',
    warning: '#FFD60A',
    error: '#FF453A',
    gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradient2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    gradient3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    gradient4: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    gradient5: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    cardBg: 'rgba(255, 255, 255, 0.03)',
    cardBgHover: 'rgba(255, 255, 255, 0.06)',
    heroGradient: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), transparent)',
    glassEffect: 'saturate(180%) blur(20px)',
  },
  light: {
    name: 'light',
    bg: '#ffffff',
    bgSecondary: '#f5f5f7',
    surface: 'rgba(255, 255, 255, 0.8)',
    surfaceHover: 'rgba(255, 255, 255, 0.95)',
    surfaceSolid: '#ffffff',
    border: 'rgba(0, 0, 0, 0.08)',
    borderHover: 'rgba(0, 0, 0, 0.15)',
    text: '#1d1d1f',
    textSecondary: 'rgba(0, 0, 0, 0.56)',
    textTertiary: 'rgba(0, 0, 0, 0.36)',
    accent: '#0071E3',
    accentHover: '#0077ED',
    accentGlow: 'rgba(0, 113, 227, 0.2)',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradient2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    gradient3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    gradient4: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    gradient5: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    cardBg: 'rgba(0, 0, 0, 0.02)',
    cardBgHover: 'rgba(0, 0, 0, 0.04)',
    heroGradient: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.15), transparent)',
    glassEffect: 'saturate(180%) blur(20px)',
  }
};

const INDIA_LOCATIONS = [
  { id: 'noida', name: 'Noida' }, { id: 'delhi', name: 'Delhi' },
  { id: 'gurgaon', name: 'Gurugram' }, { id: 'bangalore', name: 'Bengaluru' },
  { id: 'hyderabad', name: 'Hyderabad' }, { id: 'mumbai', name: 'Mumbai' },
  { id: 'pune', name: 'Pune' }, { id: 'chennai', name: 'Chennai' },
];

const PLATFORMS = {
  linkedin: { name: 'LinkedIn', icon: '💼', color: '#0A66C2', region: 'global', getUrl: (r, l) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(r)}&location=${encodeURIComponent(l)}&sortBy=DD&f_TPR=r86400`, description: 'Professional networking' },
  naukri: { name: 'Naukri', icon: '🔵', color: '#4A67FF', region: 'india', getUrl: (r, l) => `https://www.naukri.com/${r.toLowerCase().replace(/\s+/g, '-')}-jobs-in-${l.toLowerCase()}?sort=date`, description: '#1 in India' },
  instahyre: { name: 'Instahyre', icon: '🚀', color: '#FF6B35', region: 'india', getUrl: (r) => `https://www.instahyre.com/search-jobs/?job_types=fulltime&job_titles=${encodeURIComponent(r)}`, description: 'Startup jobs' },
  indeed: { name: 'Indeed', icon: '🔍', color: '#2164F3', region: 'global', getUrl: (r, l) => `https://in.indeed.com/jobs?q=${encodeURIComponent(r)}&l=${encodeURIComponent(l)}&sort=date`, description: 'Global aggregator' },
  glassdoor: { name: 'Glassdoor', icon: '🚪', color: '#0CAA41', region: 'global', getUrl: (r) => `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(r)}&sortBy=date_desc`, description: 'Reviews + jobs' },
  foundit: { name: 'Foundit', icon: '🎯', color: '#E91E63', region: 'india', getUrl: (r, l) => `https://www.foundit.in/srp/results?query=${encodeURIComponent(r)}&locations=${encodeURIComponent(l)}&sort=1`, description: 'Monster India' },
  wellfound: { name: 'Wellfound', icon: '😇', color: '#000000', region: 'global', getUrl: () => `https://wellfound.com/role/l/product-manager/india`, description: 'Startup equity' },
  cutshort: { name: 'Cutshort', icon: '⚡', color: '#FF4757', region: 'india', getUrl: (r) => `https://cutshort.io/jobs/${r.toLowerCase().replace(/\s+/g, '-')}-jobs`, description: 'AI-powered' },
  levelsfyi: { name: 'Levels.fyi', icon: '📊', color: '#00D4AA', region: 'global', getUrl: () => `https://www.levels.fyi/jobs?searchText=Product%20Manager&countryId=115`, description: 'Salary insights' },
  remoteok: { name: 'RemoteOK', icon: '🌍', color: '#00D4AA', region: 'remote', getUrl: () => 'https://remoteok.com/remote-product-manager-jobs', description: 'Remote-first' },
  weworkremotely: { name: 'WeWorkRemotely', icon: '🏠', color: '#2D3748', region: 'remote', getUrl: () => 'https://weworkremotely.com/categories/remote-product-jobs', description: 'Top remote board' },
  remoteco: { name: 'Remote.co', icon: '🌐', color: '#3182CE', region: 'remote', getUrl: () => 'https://remote.co/remote-jobs/product/', description: 'Curated remote' },
  builtin: { name: 'Built In', icon: '🏙️', color: '#0066FF', region: 'us', getUrl: () => 'https://builtin.com/jobs/product-management', description: 'US tech hubs' },
  otta: { name: 'Otta', icon: '✨', color: '#FF6B6B', region: 'global', getUrl: () => 'https://otta.com/jobs?title=Product+Manager', description: 'Curated tech' },
};

const GOOGLE_HACKS = [
  { id: 'linkedin-hidden', title: 'LinkedIn Hidden Jobs', query: 'site:linkedin.com/jobs "product manager" ("noida" OR "delhi" OR "bangalore")', tip: 'Find unlisted positions', icon: '🔮' },
  { id: 'company-careers', title: 'Direct Career Pages', query: 'site:*.com/careers OR site:*.com/jobs "product manager" india -linkedin -naukri', tip: 'Skip the middleman', icon: '🎯' },
  { id: 'greenhouse-lever', title: 'ATS Direct Access', query: '(site:boards.greenhouse.io OR site:jobs.lever.co) "product manager"', tip: 'Jobs before job boards', icon: '⚡' },
  { id: 'recent-24h', title: 'Posted Today', query: '"product manager" (hiring OR "join our team") india', tip: 'Be first to apply', icon: '🕐', timeFilter: true },
  { id: 'stealth-startups', title: 'Stealth Startups', query: '("stealth startup" OR "stealth mode") "product manager" hiring', tip: 'Early employee perks', icon: '🥷' },
  { id: 'remote-worldwide', title: 'Global Remote', query: '"product manager" remote worldwide -"us only" -"uk only"', tip: 'Work from anywhere', icon: '🌍' },
  { id: 'salary-disclosed', title: 'Salary Transparent', query: '"product manager" india (CTC OR LPA OR salary) (₹ OR lakhs)', tip: 'Know your worth', icon: '💰' },
  { id: 'referral-posts', title: 'Referral Opportunities', query: 'site:linkedin.com/posts "product manager" ("referral" OR "hiring in my team")', tip: '10x better odds', icon: '🤝' },
];

const MESSAGE_TEMPLATES = {
  connectionRequest: [
    { id: 'cr1', title: 'Fellow PM Connection', context: 'Connecting with peers', message: `Hi [Name],\n\nI came across your profile and was impressed by your work at [Company]. As a fellow PM with [X] years experience, I'd love to connect and exchange insights.\n\nLooking forward!` },
    { id: 'cr2', title: 'Opportunity Explorer', context: 'Job hunting mode', message: `Hi [Name],\n\nI've been following [Company]'s product journey, especially [specific product/feature]. As a PM with [X] years in [domain], I'm exploring new opportunities.\n\nWould love to connect!` },
    { id: 'cr3', title: 'Alumni Network', context: 'Shared background', message: `Hi [Name],\n\nFellow [College/Company] alum here! Great to see your success at [Company] as a PM.\n\nAlways wonderful to expand our network!` },
  ],
  referralRequest: [
    { id: 'rr1', title: 'Direct Referral', context: 'Clear ask', message: `Hi [Name],\n\nThank you for connecting! I noticed [Company] has an opening for [Role] that aligns perfectly with my [X] years in [domain].\n\nKey achievements:\n• [Achievement 1 with metrics]\n• [Achievement 2 with metrics]\n\nWould you be open to providing a referral? Happy to share my resume.\n\nThank you!` },
    { id: 'rr2', title: 'Soft Exploration', context: 'Testing waters', message: `Hi [Name],\n\nHope you're doing well! [Company] has been on my radar because of [specific reason].\n\nI'd love to learn:\n1. PM team structure and culture\n2. Any upcoming opportunities\n\nIf there's a potential fit, I'd really appreciate a referral.` },
  ],
  followUp: [
    { id: 'fu1', title: 'Gentle Nudge', context: 'After 1 week silence', message: `Hi [Name],\n\nHope you're having a great week! Just following up on my previous message about [topic].\n\nNo pressure at all - just wanted to ensure it didn't get buried.\n\nWould love to hear from you!` },
    { id: 'fu2', title: 'Post-Interview', context: 'Thank you note', message: `Hi [Name],\n\nThank you for the conversation about [Role]. I thoroughly enjoyed learning about [specific topic].\n\nOur discussion reinforced my excitement. My experience in [skill] aligns well with [goal discussed].\n\nLooking forward to next steps!` },
  ],
  coldOutreach: [
    { id: 'co1', title: 'To Hiring Manager', context: 'Direct approach', message: `Hi [Name],\n\nI noticed you're building the PM team at [Company]. I've been following your product journey, especially [feature].\n\nI'm a PM with [X] years experience:\n• [Achievement 1 with metrics]\n• [Achievement 2 with metrics]\n\nWould you be open to a brief chat?\n\nBest regards` },
  ],
};

const REMOTE_STRATEGIES = [
  { title: 'Top Remote Platforms', icon: '🌍', items: [
    { name: 'RemoteOK', url: 'https://remoteok.com/remote-product-manager-jobs', tip: 'Filter "Worldwide"' },
    { name: 'We Work Remotely', url: 'https://weworkremotely.com/categories/remote-product-jobs', tip: 'Premium remote' },
    { name: 'Remote.co', url: 'https://remote.co/remote-jobs/product/', tip: 'Curated quality' },
    { name: 'FlexJobs', url: 'https://www.flexjobs.com/search?search=product+manager', tip: 'Vetted listings' },
  ]},
  { title: 'Remote-First Companies', icon: '🏢', items: [
    { name: 'GitLab • Fully remote, transparent' },
    { name: 'Zapier • Async-first culture' },
    { name: 'Automattic • WordPress parent' },
    { name: 'Buffer • Transparent salaries' },
    { name: 'Notion • Growing remote team' },
  ]},
];

const INTL_STRATEGIES = {
  us: { title: '🇺🇸 United States', platforms: [
    { name: 'Built In', url: 'https://builtin.com/jobs/product-management' },
    { name: 'LinkedIn US', url: 'https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=United%20States&f_WT=2&sortBy=DD' },
  ], tips: ['US resume: no photo/DOB', 'Target Series B+ for H1B', 'Build US LinkedIn network'], sponsors: ['Google', 'Meta', 'Amazon', 'Microsoft', 'Stripe', 'Airbnb'] },
  uk: { title: '🇬🇧 United Kingdom', platforms: [
    { name: 'Otta London', url: 'https://otta.com/jobs?title=Product+Manager&location=London' },
    { name: 'Indeed UK', url: 'https://uk.indeed.com/jobs?q=product+manager' },
  ], tips: ['Skilled Worker visa route', 'UK CV: 2 pages max', 'Look for sponsorship mention'], sponsors: ['Revolut', 'Monzo', 'Wise', 'Deliveroo', 'Checkout.com'] },
};

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRegion, setSelectedRegion] = useState('india');
  const [copiedId, setCopiedId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  const t = themes[theme];

  useEffect(() => { setIsLoaded(true); }, []);

  const copyToClipboard = useCallback((text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const toggleSection = (id) => setExpandedSections(p => ({ ...p, [id]: !p[id] }));
  const openMultiple = (urls) => urls.forEach((u, i) => setTimeout(() => window.open(u, '_blank', 'noopener'), i * 400));

  const cardStyle = { background: t.cardBg, backdropFilter: 'blur(20px)', border: `1px solid ${t.border}`, borderRadius: '20px', padding: '24px', transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)' };
  const buttonPrimary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px 32px', background: t.accent, border: 'none', borderRadius: '980px', color: '#fff', fontSize: '17px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)', boxShadow: `0 4px 24px ${t.accentGlow}`, textDecoration: 'none' };
  const buttonSecondary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '980px', color: t.text, fontSize: '15px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease', textDecoration: 'none' };
  const tabStyle = (isActive) => ({ padding: '10px 20px', background: isActive ? t.accent : 'transparent', border: 'none', borderRadius: '980px', color: isActive ? '#fff' : t.textSecondary, fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' });

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', transition: 'background 0.5s ease, color 0.3s ease', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: t.heroGradient, pointerEvents: 'none', zIndex: 0, opacity: isLoaded ? 1 : 0, transition: 'opacity 1s ease' }} />

      <nav style={{ position: 'sticky', top: 0, zIndex: 1000, backdropFilter: t.glassEffect, WebkitBackdropFilter: t.glassEffect, background: theme === 'dark' ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.72)', borderBottom: `0.5px solid ${t.border}`, transition: 'all 0.3s ease' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: t.gradient1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)' }}>🎯</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '19px', fontWeight: '600', letterSpacing: '-0.3px' }}>PM Jobs</h1>
              <p style={{ margin: 0, fontSize: '11px', color: t.textSecondary }}>Find your next role</p>
            </div>
          </div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ width: '44px', height: '44px', borderRadius: '50%', background: t.cardBg, border: `1px solid ${t.border}`, color: t.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px', display: 'flex', gap: '8px', overflowX: 'auto', position: 'relative', zIndex: 10 }}>
        {[
          { id: 'home', icon: <Sparkles size={16} />, label: 'Home' },
          { id: 'jobs', icon: <Briefcase size={16} />, label: 'Jobs' },
          { id: 'hacks', icon: <Lightbulb size={16} />, label: 'Hacks' },
          { id: 'remote', icon: <Globe size={16} />, label: 'Remote' },
          { id: 'intl', icon: <Target size={16} />, label: 'US/UK' },
          { id: 'templates', icon: <MessageSquare size={16} />, label: 'Templates' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabStyle(activeTab === tab.id)}>{tab.icon}{tab.label}</button>
        ))}
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px', position: 'relative', zIndex: 10 }}>

        {activeTab === 'home' && (
          <div style={{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
            <section style={{ textAlign: 'center', padding: '60px 0 80px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: theme === 'dark' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(52, 199, 89, 0.15)', borderRadius: '980px', marginBottom: '24px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.success, animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '14px', color: t.success, fontWeight: '500' }}>Live • 14 platforms connected</span>
              </div>
              <h1 style={{ fontSize: 'clamp(44px, 10vw, 80px)', fontWeight: '700', letterSpacing: '-0.04em', lineHeight: '1.05', margin: '0 0 24px', background: theme === 'dark' ? 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.7) 100%)' : 'linear-gradient(180deg, #1d1d1f 0%, rgba(29,29,31,0.8) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Land your dream<br /><span style={{ background: t.gradient3, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>PM role.</span>
              </h1>
              <p style={{ fontSize: '21px', color: t.textSecondary, lineHeight: '1.5', maxWidth: '600px', margin: '0 auto 40px', fontWeight: '400' }}>
                One toolkit. Every job board. Google hacks. LinkedIn templates.<br />All sorted by newest first.
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => openMultiple(['https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=India&sortBy=DD&f_TPR=r86400','https://www.naukri.com/product-manager-jobs?sort=date','https://www.instahyre.com/search-jobs/?job_types=fulltime&job_titles=Product%20Manager','https://in.indeed.com/jobs?q=product+manager&sort=date','https://www.glassdoor.co.in/Job/india-product-manager-jobs-SRCH_IL.0,5_IN115_KO6,21.htm?sortBy=date_desc'])} style={buttonPrimary}><Zap size={20} />Open All Platforms<ArrowRight size={18} /></button>
                <button onClick={() => setActiveTab('jobs')} style={buttonSecondary}>Explore Jobs</button>
              </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '80px' }}>
              {[
                { number: '14+', label: 'Job Platforms', icon: <Briefcase size={24} />, gradient: t.gradient1 },
                { number: '8', label: 'Google Hacks', icon: <Lightbulb size={24} />, gradient: t.gradient5 },
                { number: '10+', label: 'Message Templates', icon: <MessageSquare size={24} />, gradient: t.gradient3 },
                { number: '8', label: 'Indian Cities', icon: <MapPin size={24} />, gradient: t.gradient4 },
              ].map((stat, i) => (
                <div key={i} style={{ ...cardStyle, textAlign: 'center', padding: '32px 24px', opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(20px)', transition: `all 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) ${i * 0.1}s` }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: stat.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff' }}>{stat.icon}</div>
                  <div style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '4px' }}>{stat.number}</div>
                  <div style={{ fontSize: '14px', color: t.textSecondary }}>{stat.label}</div>
                </div>
              ))}
            </section>

            <section style={{ marginBottom: '80px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '700', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '48px' }}>Everything you need</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {[
                  { title: 'Job Search', desc: 'All major platforms in one place. LinkedIn, Naukri, Indeed, and 11 more.', icon: '🎯', action: () => setActiveTab('jobs') },
                  { title: 'Google Hacks', desc: 'Secret search queries to find hidden jobs before anyone else.', icon: '🔮', action: () => setActiveTab('hacks') },
                  { title: 'Remote & International', desc: 'Remote-first companies and US/UK market strategies.', icon: '🌍', action: () => setActiveTab('remote') },
                  { title: 'LinkedIn Templates', desc: 'Copy-paste messages for connections, referrals, and follow-ups.', icon: '💬', action: () => setActiveTab('templates') },
                ].map((feature, i) => (
                  <button key={i} onClick={feature.action} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', border: `1px solid ${t.border}`, opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(20px)', transition: `all 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) ${i * 0.1 + 0.3}s` }}>
                    <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>{feature.icon}</span>
                    <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '600' }}>{feature.title}</h3>
                    <p style={{ margin: 0, fontSize: '15px', color: t.textSecondary, lineHeight: '1.5' }}>{feature.desc}</p>
                    <div style={{ marginTop: '16px', color: t.accent, fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>Explore <ArrowRight size={14} /></div>
                  </button>
                ))}
              </div>
            </section>

            <section style={{ ...cardStyle, background: theme === 'dark' ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' : 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)', padding: '40px', textAlign: 'center' }}>
              <Award size={40} style={{ color: t.warning, marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: '600' }}>Pro Tip</h3>
              <p style={{ margin: '0 0 24px', fontSize: '17px', color: t.textSecondary, maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>Apply within 24 hours of a job posting — you're <strong style={{ color: t.text }}>3x more likely</strong> to get a response.</p>
              <button onClick={() => window.open('https://www.google.com/search?q=' + encodeURIComponent('site:linkedin.com/jobs "product manager" india') + '&tbs=qdr:d', '_blank')} style={{ ...buttonSecondary, background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}><Search size={16} />Find Jobs Posted Today</button>
            </section>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
              {[{ id: 'india', label: '🇮🇳 India', desc: 'All major cities' }, { id: 'remote', label: '🌍 Remote', desc: 'Work anywhere' }, { id: 'intl', label: '🌐 International', desc: 'US, UK & more' }].map(r => (
                <button key={r.id} onClick={() => setSelectedRegion(r.id)} style={{ padding: '20px 28px', background: selectedRegion === r.id ? t.accent : t.cardBg, border: `1px solid ${selectedRegion === r.id ? t.accent : t.border}`, borderRadius: '16px', color: selectedRegion === r.id ? '#fff' : t.text, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{r.label}</div>
                  <div style={{ fontSize: '13px', opacity: 0.7 }}>{r.desc}</div>
                </button>
              ))}
            </div>

            <div style={{ ...cardStyle, marginBottom: '32px', background: theme === 'dark' ? 'linear-gradient(135deg, rgba(10, 132, 255, 0.15) 0%, rgba(102, 126, 234, 0.15) 100%)' : 'linear-gradient(135deg, rgba(0, 113, 227, 0.08) 0%, rgba(102, 126, 234, 0.08) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '600' }}>⚡ Quick Launch</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: t.textSecondary }}>Open top 5 platforms sorted by newest</p>
                </div>
                <button onClick={() => { const urls = selectedRegion === 'india' ? ['https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=India&sortBy=DD&f_TPR=r86400', 'https://www.naukri.com/product-manager-jobs?sort=date', 'https://www.instahyre.com/search-jobs/?job_types=fulltime&job_titles=Product%20Manager', 'https://in.indeed.com/jobs?q=product+manager&sort=date', 'https://www.glassdoor.co.in/Job/india-product-manager-jobs-SRCH_IL.0,5_IN115_KO6,21.htm?sortBy=date_desc'] : selectedRegion === 'remote' ? ['https://remoteok.com/remote-product-manager-jobs', 'https://weworkremotely.com/categories/remote-product-jobs', 'https://www.linkedin.com/jobs/search/?keywords=product%20manager&f_WT=2&sortBy=DD', 'https://wellfound.com/role/l/product-manager'] : ['https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=United%20States&f_WT=2&sortBy=DD', 'https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=United%20Kingdom&f_WT=2&sortBy=DD', 'https://builtin.com/jobs/product-management', 'https://otta.com/jobs?title=Product+Manager']; openMultiple(urls); }} style={buttonPrimary}><Rocket size={18} />Launch All</button>
              </div>
            </div>

            <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '600' }}>{selectedRegion === 'india' ? 'Indian Platforms' : selectedRegion === 'remote' ? 'Remote Platforms' : 'International Platforms'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '48px' }}>
              {Object.entries(PLATFORMS).filter(([, p]) => selectedRegion === 'india' ? (p.region === 'india' || p.region === 'global') : selectedRegion === 'remote' ? (p.region === 'remote' || p.region === 'global') : (p.region === 'us' || p.region === 'global')).map(([id, p]) => (
                <a key={id} href={p.getUrl('Product Manager', 'India')} target="_blank" rel="noopener noreferrer" style={{ ...cardStyle, textDecoration: 'none', color: t.text, display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '32px' }}>{p.icon}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '2px' }}>{p.name}</div><div style={{ fontSize: '13px', color: t.textSecondary }}>{p.description}</div></div>
                  <ExternalLink size={18} style={{ color: t.textTertiary }} />
                </a>
              ))}
            </div>

            {selectedRegion === 'india' && (<>
              <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '600' }}>📍 Search by City</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {INDIA_LOCATIONS.map(l => (
                  <a key={l.id} href={`https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=${encodeURIComponent(l.name + ', India')}&sortBy=DD&f_TPR=r86400`} target="_blank" rel="noopener noreferrer" style={{ ...cardStyle, textDecoration: 'none', color: t.text, textAlign: 'center', padding: '20px 16px' }}>
                    <MapPin size={20} style={{ color: t.accent, marginBottom: '8px' }} /><div style={{ fontSize: '15px', fontWeight: '500' }}>{l.name}</div>
                  </a>
                ))}
              </div>
            </>)}
          </div>
        )}

        {activeTab === 'hacks' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '12px' }}>Google Search Hacks</h2>
              <p style={{ fontSize: '17px', color: t.textSecondary, maxWidth: '500px', margin: '0 auto' }}>Secret queries to discover jobs before they appear on job boards</p>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              {GOOGLE_HACKS.map((h, i) => (
                <div key={h.id} style={{ ...cardStyle, opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(10px)', transition: `all 0.4s ease ${i * 0.05}s` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '28px' }}>{h.icon}</span>
                      <div><h3 style={{ margin: '0 0 2px', fontSize: '17px', fontWeight: '600' }}>{h.title}</h3><p style={{ margin: 0, fontSize: '13px', color: t.textSecondary }}>{h.tip}</p></div>
                    </div>
                    <button onClick={() => window.open('https://www.google.com/search?q=' + encodeURIComponent(h.query) + (h.timeFilter ? '&tbs=qdr:d' : ''), '_blank')} style={{ ...buttonPrimary, padding: '10px 20px', fontSize: '14px' }}><Search size={16} />Search</button>
                  </div>
                  <div style={{ background: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.04)', padding: '14px 16px', borderRadius: '12px', fontFamily: 'SF Mono, Monaco, monospace', fontSize: '12px', color: theme === 'dark' ? '#64d2ff' : '#0071e3', overflowX: 'auto', whiteSpace: 'nowrap' }}>{h.query}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'remote' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '12px' }}>Remote & International</h2>
              <p style={{ fontSize: '17px', color: t.textSecondary }}>Work from India for global companies</p>
            </div>
            {REMOTE_STRATEGIES.map((section, i) => (
              <div key={i} style={{ ...cardStyle, marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '24px' }}>{section.icon}</span>{section.title}</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {section.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', borderRadius: '12px', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px' }}>{item.name}{item.tip && <span style={{ color: t.textSecondary }}> • {item.tip}</span>}</span>
                      {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ ...buttonSecondary, padding: '8px 14px', fontSize: '13px' }}>Open <ExternalLink size={12} /></a>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.entries(INTL_STRATEGIES).map(([key, data]) => (
              <div key={key} style={{ ...cardStyle, marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '600' }}>{data.title}</h3>
                <div style={{ marginBottom: '20px' }}><h4 style={{ margin: '0 0 12px', fontSize: '13px', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platforms</h4><div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>{data.platforms.map((p, i) => <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" style={{ ...buttonSecondary, padding: '10px 16px', fontSize: '14px' }}>{p.name} <ExternalLink size={14} /></a>)}</div></div>
                <div style={{ marginBottom: '20px' }}><h4 style={{ margin: '0 0 12px', fontSize: '13px', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tips</h4><div style={{ display: 'grid', gap: '8px' }}>{data.tips.map((tip, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}><Star size={14} style={{ color: t.warning }} />{tip}</div>)}</div></div>
                <div><h4 style={{ margin: '0 0 12px', fontSize: '13px', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sponsor-Friendly Companies</h4><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{data.sponsors.map((c, i) => <span key={i} style={{ padding: '6px 12px', background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderRadius: '8px', fontSize: '13px' }}>{c}</span>)}</div></div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'templates' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '12px' }}>LinkedIn Templates</h2>
              <p style={{ fontSize: '17px', color: t.textSecondary }}>Copy-paste messages for networking and referrals</p>
            </div>
            {Object.entries(MESSAGE_TEMPLATES).map(([cat, temps]) => (
              <div key={cat} style={{ marginBottom: '20px' }}>
                <button onClick={() => toggleSection(cat)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: expandedSections[cat] ? '16px 16px 0 0' : '16px', color: t.text, cursor: 'pointer', fontSize: '16px', fontWeight: '600', transition: 'all 0.2s ease' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {cat === 'connectionRequest' && <Users size={20} />}{cat === 'referralRequest' && <Star size={20} />}{cat === 'followUp' && <Clock size={20} />}{cat === 'coldOutreach' && <Mail size={20} />}
                    {cat.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    <span style={{ padding: '4px 10px', background: t.accent, borderRadius: '12px', fontSize: '12px', color: '#fff' }}>{temps.length}</span>
                  </span>
                  {expandedSections[cat] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expandedSections[cat] && (
                  <div style={{ border: `1px solid ${t.border}`, borderTop: 'none', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
                    {temps.map((template, i) => (
                      <div key={template.id} style={{ padding: '24px', borderBottom: i < temps.length - 1 ? `1px solid ${t.border}` : 'none', background: t.surfaceSolid }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                          <div><h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600' }}>{template.title}</h4><p style={{ margin: 0, fontSize: '13px', color: t.textSecondary }}>{template.context}</p></div>
                          <button onClick={() => copyToClipboard(template.message, template.id)} style={{ ...buttonPrimary, padding: '10px 18px', fontSize: '14px', background: copiedId === template.id ? t.success : t.accent }}>{copiedId === template.id ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy</>}</button>
                        </div>
                        <div style={{ padding: '18px', background: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.03)', borderRadius: '12px', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{template.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </main>

      <footer style={{ borderTop: `1px solid ${t.border}`, padding: '24px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <p style={{ fontSize: '13px', color: t.textSecondary, margin: 0 }}>PM Jobs Toolkit • Built for Product Managers in India 🇮🇳</p>
      </footer>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.95); } }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: ${t.textTertiary}; }
        ::selection { background: ${t.accent}; color: #fff; }
      `}</style>
    </div>
  );
}
